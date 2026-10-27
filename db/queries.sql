-- Example queries the app will use. Parameters are written as :name.

-- 1. Ingredient search (typing box, receipt lines).
--    :query_norm  = input normalized like build_db.normalize (no accents), % and _ stripped.
--    :query_lower = input like build_db.lower (accents kept), or NULL if the user typed
--                   no accents.
--    Each ingredient keeps its best-matching name or alias. rank (lower is better) adds up:
--      tier       0 query matches whole words ("cá" in "cá lóc"), 4 a word starts with it
--                 ("cá" in "các loại"), 8 it is inside a word
--      accents    +2 if the user typed accents and they differ ("cá" typed: "cà chua" drops)
--      alias      +1 for an alias rather than the main Vietnamese name
--      English    +12, so English names only lead when nothing Vietnamese matches
--    then, within the same rank, the most common ingredients (used in the most meals) first.
SELECT i.id, i.name_vi, i.name_en, i.category_id, i.popularity, i.recipe_count, m.rank
FROM (
    SELECT ingredient_id,
           MIN(CASE
                 WHEN ' ' || term_norm || ' ' LIKE '% ' || :query_norm || ' %' THEN 0
                 WHEN ' ' || term_norm LIKE '% ' || :query_norm || '%' THEN 4
                 ELSE 8
               END
               + 2 * (:query_lower IS NOT NULL AND instr(term_lower, :query_lower) = 0)
               + (kind = 'alias')
               + 12 * (kind = 'name_en')) AS rank
    FROM ingredient_aliases
    WHERE term_norm LIKE '%' || :query_norm || '%'
    GROUP BY ingredient_id
) m
JOIN ingredients i ON i.id = m.ingredient_id
ORDER BY m.rank, i.popularity DESC, length(i.name_vi)
LIMIT 20;

-- 1b. Browse one category, most common first (ingredient picker with an empty search box).
SELECT id, name_vi, name_en, popularity, recipe_count
FROM ingredients
WHERE category_id = :category
ORDER BY popularity DESC, name_vi;

-- 2. "What to cook today": rank recipes by how many key ingredients the pantry covers,
--    easiest first (difficulty = 1-5 stars) among recipes with a similar match.
--    Filters: cuisine, cooking method, tag (e.g. 'healthy'), max time.
--    No-repeat: skip recipes cooked in the last :no_repeat_days days when enabled.
SELECT c.id, c.name_vi, c.difficulty, c.total_min, c.image_url,
       s.have_count, s.substitute_count, s.missing_count, s.match_ratio, s.missing
FROM v_recipe_pantry_score s
JOIN v_recipe_cards c ON c.id = s.recipe_id
LEFT JOIN v_recipe_last_cooked lc ON lc.recipe_id = s.recipe_id
WHERE (:cuisine IS NULL OR c.cuisine_id = :cuisine)
  AND (:method IS NULL OR EXISTS (SELECT 1 FROM recipe_cooking_methods m
                                  WHERE m.recipe_id = c.id AND m.cooking_method_id = :method))
  AND (:tag IS NULL OR EXISTS (SELECT 1 FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
                               WHERE rt.recipe_id = c.id AND t.name = :tag))
  AND (:max_min IS NULL OR c.total_min <= :max_min)
  AND (:no_repeat_days IS NULL
       OR lc.last_cooked_at IS NULL
       OR lc.last_cooked_at < datetime('now', '-' || :no_repeat_days || ' days'))
ORDER BY round(s.match_ratio * 10) DESC, c.difficulty, s.missing_count, c.total_min
LIMIT 20;

-- 3. "Choose one ingredient": every recipe that uses it, directly or as a substitute.
SELECT u.role, c.id, c.name_vi, c.total_min, c.difficulty
FROM v_ingredient_usage u
JOIN v_recipe_cards c ON c.id = u.recipe_id
WHERE u.ingredient_id = :ingredient_id
ORDER BY u.role, c.difficulty, c.total_min;

-- 4. How this ingredient is prepared: the steps that use it, across recipes.
SELECT r.name_vi AS recipe, st.step_order, st.type_id, st.title, st.text, st.tip
FROM step_ingredients si
JOIN recipe_steps st ON st.id = si.step_id
JOIN recipes r ON r.id = st.recipe_id
WHERE si.ingredient_id = :ingredient_id AND st.type_id IN ('prep', 'marinate')
ORDER BY r.name_vi, st.step_order;

-- 5. Recipe detail: ingredient lines with units and substitutes, then steps.
SELECT ri.position, i.name_vi, ri.amount, u.name_vi AS unit, ri.group_id, ri.optional,
       ri.is_key, ri.note,
       (SELECT group_concat(si.name_vi || CASE WHEN s.note IS NOT NULL THEN ' (' || s.note || ')' ELSE '' END, '; ')
          FROM ingredient_substitutes s JOIN ingredients si ON si.id = s.substitute_id
         WHERE s.recipe_ingredient_id = ri.id) AS substitutes
FROM recipe_ingredients ri
JOIN ingredients i ON i.id = ri.ingredient_id
LEFT JOIN units u ON u.id = ri.unit_id
WHERE ri.recipe_id = :recipe_id
ORDER BY ri.position;

SELECT step_order, type_id, duration_min, title, text, tip, passive
FROM recipe_steps WHERE recipe_id = :recipe_id ORDER BY step_order;

-- 6. Record that the user cooked a dish (feeds the no-repeat window).
INSERT INTO meal_history (recipe_id, event) VALUES (:recipe_id, 'cooked');

-- 7. Browse by cuisine: how many dishes each country has, then one cuisine's dishes,
--    easiest first. :cuisine is a cuisines.id such as 'vietnamese', 'korean', 'japanese'.
SELECT cu.id, cu.name_vi, cu.name_en, COUNT(r.id) AS recipes
FROM cuisines cu LEFT JOIN recipes r ON r.cuisine_id = cu.id
GROUP BY cu.id ORDER BY cu.sort;

SELECT r.id, r.name_vi, r.name_en, r.difficulty, r.total_min, r.dish_type_id
FROM recipes r
WHERE r.cuisine_id = :cuisine
ORDER BY r.difficulty, r.total_min, r.name_vi;

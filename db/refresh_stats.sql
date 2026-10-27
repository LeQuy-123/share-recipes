-- Recompute the derived ranking columns on ingredients.
-- build_db.py runs this after import; the app runs it again after adding recipes on the phone.
--
-- popularity (0-100) =
--     60 * recipe_count / max recipe_count         -- appears in many meals
--   + 10 * substitute_count / max substitute_count -- useful as a stand-in
--   + 30 * (commonness - 1) / 4                    -- curated: common in Vietnamese kitchens
-- The commonness part lets ingredients that no recipe uses yet still rank sensibly.

UPDATE ingredients SET
    recipe_count = (
        SELECT COUNT(DISTINCT ri.recipe_id)
        FROM recipe_ingredients ri
        WHERE ri.ingredient_id = ingredients.id),
    substitute_count = (
        SELECT COUNT(DISTINCT ri.recipe_id)
        FROM ingredient_substitutes s
        JOIN recipe_ingredients ri ON ri.id = s.recipe_ingredient_id
        WHERE s.substitute_id = ingredients.id);

UPDATE ingredients SET popularity = ROUND(
      60.0 * recipe_count     / MAX(1, (SELECT MAX(recipe_count)     FROM ingredients))
    + 10.0 * substitute_count / MAX(1, (SELECT MAX(substitute_count) FROM ingredients))
    + 30.0 * (commonness - 1) / 4.0, 1);

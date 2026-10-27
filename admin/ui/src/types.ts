// Shapes of the admin API (admin/server.py). Recipe / ingredient objects use the same
// fields as recipt.json and data/*.json.

export interface LookupRow {
  id: string | number
  name_vi?: string | null
  name_en?: string | null
  sort?: number
  [key: string]: unknown
}

export interface Unit {
  vi: string
  en: string
  type: 'weight' | 'volume' | 'count'
  ml?: number | null
}

export interface RecipeSummary {
  id: string
  name_vi: string
  name_en: string | null
  cuisine: string
  dish_type: string | null
  difficulty: number
  servings: number
  total_min: number | null
  has_image: boolean
  references: number
  home: string
  kcal?: number
  health_score?: number
  coverage?: number
}

export interface IngredientSummary {
  id: string
  name_vi: string
  name_en: string
  category: string
  commonness?: number
  pantry_staple?: boolean
  aliases?: string[]
  home: string
  has_nutrition: boolean
  used_in: number
  popularity: number | null
}

export interface AppState {
  built_at: string | null
  warnings: number
  recipes: RecipeSummary[]
  ingredients: IngredientSummary[]
  lookups: Record<string, LookupRow[]>
  units: Record<string, Unit>
}

export interface Substitute {
  ingredient_id: string
  ratio: number
  note?: string
}

export interface RecipeLine {
  ingredient_id: string
  amount: number | null
  unit: string
  group: string
  optional: boolean
  note?: string
  substitutes: Substitute[]
}

export interface Step {
  order?: number
  type: string
  duration_min: number
  title?: string | null
  text: string
  ingredients_used: string[]
  passive: boolean
  tip?: string
}

export interface RecipeImage {
  url: string
  original_url?: string | null
  source_page?: string | null
  license?: string | null
  license_url?: string | null
  author?: string | null
  kind: 'dish' | 'ingredient'
}

export interface Recipe {
  id: string
  name_vi: string
  name_en: string | null
  other_names: string[]
  description: string | null
  cuisine: string
  region: string | null
  meal_types: string[]
  dish_type: string
  cooking_methods: string[]
  main_protein: string
  difficulty: number
  servings: number
  time?: { prep_min: number; cook_min: number; total_min: number; active_min: number }
  tags: string[]
  image: RecipeImage | null
  key_ingredients: string[]
  ingredients: RecipeLine[]
  steps: Step[]
  notes: string | null
  references: { source: string; url: string }[]
  _home?: string
}

export interface Nutrition {
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  density?: number
  edible?: number
  units?: Record<string, number>
}

export interface Ingredient {
  name_vi: string
  name_en: string
  category: string
  commonness?: number
  pantry_staple?: boolean
  aliases?: string[]
  _home?: string
}

export interface RecipeNutrition {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  veg_g: number
  coverage: number
  health_score: number
  health_notes: string | null
}

export interface Issue {
  level: 'error' | 'warning' | 'info'
  kind: 'build' | 'recipe' | 'ingredient'
  id: string
  message: string
}

export interface CommonsImage {
  title: string
  url: string
  original_url: string
  source_page: string | null
  license: string | null
  license_url: string | null
  author: string | null
}

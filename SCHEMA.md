# HireAnyPro Supabase Schema

## categories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| icon | text | |
| parent_id | uuid | FK → categories.id, nullable |
| created_at | timestamptz | default now() |

## listings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE (e.g. ace-plumbing-miami) |
| description | text | |
| category_id | uuid | FK → categories.id |
| address | text | |
| city | text | |
| state | text | |
| zip | text | |
| lat | numeric | |
| lng | numeric | |
| phone | text | |
| email | text | |
| website | text | |
| hours | jsonb | e.g. {"monday":{"open":"08:00","close":"17:00"},"sunday":null} |
| photos | text[] | array of URLs |
| rating | numeric | |
| review_count | integer | default 0 |
| claimed | boolean | default false |
| owner_id | uuid | nullable |
| tier | text | default 'free' |
| featured | boolean | default false |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

## reviews
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| listing_id | uuid | FK → listings.id |
| author_name | text | |
| rating | numeric | |
| comment | text | |
| created_at | timestamptz | default now() |

## Category IDs (from seed data)
Query `select id, slug from categories` to get the UUIDs for mapping.

## Supabase Project
- Ref: adudgrfxwildzwpcvyil
- URL: https://adudgrfxwildzwpcvyil.supabase.co

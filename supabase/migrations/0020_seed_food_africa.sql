-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Méga-Pack Afrique & Quotidien (Macros du Coach)
-- Pack #1 : Plats africains, street food, boissons & compléments
-- Pack #2 : Spécialités Gabonaises & Variations Internationales
-- Pack #3 : Compléments Afrique Centrale / Repas de la semaine
-- Valeurs estimées pour 100 g (plats prêts à consommer)
-- ─────────────────────────────────────────────────────────────

insert into public.food_database
  (name, name_fr, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, category) values

-- ══════════ PACK #1 ══════════

-- 🍲 Plats en Sauce & Ragoûts traditionnels
('Nyembwe Chicken',         'Poulet Nyembwe / Sauce Moambe',       310, 14.0,  5.0, 26.0, 3.0, 'plat'),
('Palm Nut Soup',           'Sauce Graine (viande/poisson)',       290, 12.0,  6.0, 24.0, 4.0, 'plat'),
('Ndole',                   'Ndolé (viande et crevettes)',         240, 16.0,  8.0, 16.0, 6.0, 'plat'),
('Peanut Stew (Mafe)',      'Mafé Poulet / Viande',                260, 15.0, 10.0, 18.0, 3.0, 'plat'),
('Yassa Chicken',           'Poulet Yassa (sauce oignons)',        180, 16.0,  8.0, 10.0, 2.0, 'plat'),
('Thieboudienne',           'Thiéboudienne (Riz au poisson)',      190,  8.0, 25.0,  6.0, 2.0, 'plat'),
('Clear Broth Fish',        'Bouillon de poisson clair',            90, 14.0,  2.0,  3.0, 1.0, 'plat'),
('Maboke',                  'Maboké de poisson',                   130, 16.0,  2.0,  6.0, 2.0, 'plat'),
('Okra Soup (Dongo-Dongo)', 'Sauce Gombo (Dongo-Dongo)',           110,  8.0,  5.0,  6.0, 3.0, 'plat'),
('Eru / Okok',              'Eru / Okok (préparé)',                280, 12.0,  4.0, 24.0, 7.0, 'plat'),
('Biteku-teku',             'Biteku-teku / Amarante sauce',        150,  6.0,  8.0, 11.0, 4.0, 'plat'),
('Egusi Soup',              'Sauce Pistache / Egusi',              270, 14.0,  6.0, 21.0, 3.0, 'plat'),
('Kwem',                    'Kwem / Feuilles de manioc sans sel',  110,  4.0,  8.0,  7.0, 5.0, 'plat'),
('Poulet DG',               'Poulet DG (avec plantains)',          230, 12.0, 20.0, 12.0, 3.0, 'plat'),

-- 🍚 Féculents & Accompagnements d'Afrique
('Attieke',                 'Attiéké (Manioc fermenté)',           160, 1.5, 38.0, 0.2, 2.0, 'féculent'),
('Fufu (Cassava)',          'Foufou de Manioc',                    120, 0.8, 28.0, 0.2, 1.0, 'féculent'),
('Fufu (Corn)',             'Foufou de Maïs',                      110, 2.5, 24.0, 0.5, 1.5, 'féculent'),
('Placali',                 'Placali',                             130, 1.0, 31.0, 0.2, 1.5, 'féculent'),
('Taro boiled',             'Taro bouilli / Macabo',               112, 1.5, 26.0, 0.2, 4.1, 'féculent'),
('Fried Yam',               'Igname frite',                        260, 2.0, 35.0, 12.0, 4.0, 'féculent'),
('Fried Sweet Potato',      'Patate douce frite',                  240, 2.0, 32.0, 11.0, 4.0, 'féculent'),
('Bobolo',                  'Bobolo (Bâton de manioc)',            160, 1.0, 38.0, 0.2, 2.0, 'féculent'),
('Miondo',                  'Miondo',                              160, 1.0, 38.0, 0.2, 2.0, 'féculent'),

-- 🍖 Protéines Locales : Viandes, Poissons & Grillades
('Salted Fish (Morue)',     'Poisson salé (Morue séchée)',         290, 62.0, 0.0,  2.5, 0.0, 'poisson'),
('Smoked Fish',             'Poisson fumé (générique)',            210, 35.0, 0.0,  7.0, 0.0, 'poisson'),
('Grilled Capitaine',       'Capitaine braisé',                    140, 22.0, 0.0,  5.0, 0.0, 'poisson'),
('Grilled Tilapia',         'Tilapia braisé (avec huile)',         160, 20.0, 1.0,  8.0, 0.0, 'poisson'),
('Grilled Chicken',         'Poulet braisé (rue)',                 220, 24.0, 2.0, 13.0, 0.0, 'viande'),
('Bushmeat (Boar)',         'Viande de brousse (Sanglier)',        160, 28.0, 0.0,  4.0, 0.0, 'viande'),
('Bushmeat (Antelope)',     'Viande de brousse (Gazelle)',         130, 26.0, 0.0,  2.0, 0.0, 'viande'),
('Beef Tripe',              'Tripes de boeuf (Moutouki)',          100, 14.0, 0.0,  4.0, 0.0, 'viande'),
('Pork Trotters',           'Pieds de porc',                       280, 18.0, 0.0, 23.0, 0.0, 'viande'),
('Caterpillars (Mbinzo)',   'Chenilles (Mbinzo/Magots)',           360, 45.0, 5.0, 15.0, 3.0, 'viande'),
('Goat meat',               'Viande de chèvre / Cabri',            143, 27.0, 0.0,  3.0, 0.0, 'viande'),

-- 🍢 Street Food, Snacks & Fast Food Rapide
('Garba',                   'Garba (Attiéké + Thon frit)',         350, 14.0, 40.0, 15.0, 3.0, 'plat'),
('Soya / Suya',             'Soya / Choukouya (Brochette)',        250, 28.0,  3.0, 14.0, 1.0, 'viande'),
('Shawarma (Mixed)',        'Chawarma (Poulet/Boeuf)',             280, 12.0, 25.0, 15.0, 2.0, 'plat'),
('Puff-Puff / Mikate',      'Mikate / Beignets soufflés',          350,  6.0, 48.0, 15.0, 2.0, 'sucre'),
('Plantain Chips',          'Chips de plantain',                   520,  2.0, 64.0, 28.0, 6.0, 'snack'),
('Roasted Peanuts',         'Arachides grillées (rue)',            580, 25.0, 16.0, 50.0, 8.0, 'oléagineux'),
('Sugared Peanuts',         'Arachides sucrées / caramélisées',    520, 15.0, 55.0, 30.0, 5.0, 'snack'),
('Beef Sausage (Local)',    'Saucisse de boeuf (rue)',             310, 14.0,  4.0, 26.0, 0.0, 'viande'),
('Meat Pie / Pastel',       'Pastel / Chausson à la viande',       330, 10.0, 35.0, 18.0, 2.0, 'snack'),
('Nem / Spring Roll',       'Nem frit',                            280,  8.0, 28.0, 15.0, 2.0, 'snack'),
('Samosa (Meat)',           'Samoussa (Viande)',                   310, 10.0, 32.0, 16.0, 2.0, 'snack'),

-- 🥑 Fruits locaux & Ingrédients de base bruts
('Atanga / Safou',          'Atanga / Safou (bouilli)',            230,  4.0,  5.0, 22.0,  3.0, 'fruit'),
('Soursop (Corossol)',      'Corossol',                             66,  1.0, 16.8,  0.3,  3.3, 'fruit'),
('Guava',                   'Goyave',                               68,  2.6, 14.3,  0.9,  5.4, 'fruit'),
('Passion Fruit',           'Fruit de la passion (Maracuja)',       97,  2.2, 23.0,  0.7, 10.4, 'fruit'),
('Tamarind',                'Tamarin (pulpe)',                     239,  2.8, 62.5,  0.6,  5.1, 'fruit'),
('Baobab powder',           'Poudre de Baobab',                    250,  2.0, 80.0,  0.0, 45.0, 'fruit'),
('Jujube',                  'Jujube',                               79,  1.2, 20.0,  0.2,  0.0, 'fruit'),
('Red Palm Oil',            'Huile de palme rouge',                884,  0.0,  0.0,100.0,  0.0, 'matière grasse'),
('Peanut Paste',            'Pâte d''arachide brute',              588, 25.0, 20.0, 50.0,  6.0, 'matière grasse'),
('Bouillon Cube',           'Cube Maggi / Jumbo (1 cube=10g)',     180, 10.0, 20.0,  6.0,  0.0, 'sauce'),

-- 🍹 Boissons Locales
('Ginger Juice',            'Jus de Gingembre (Tangawisi)',         45, 0.0, 11.0, 0.0, 0.0, 'boisson'),
('Baobab Juice',            'Jus de Baobab (Bouye)',                60, 0.5, 14.0, 0.0, 1.0, 'boisson'),
('Local Beer',              'Bière locale (Regab, Castel...)',      45, 0.5,  3.5, 0.0, 0.0, 'boisson'),
('Malt Drink',              'Boisson Maltée (Malta, Superm.)',      65, 0.5, 15.0, 0.0, 0.0, 'boisson'),

-- 🛒 Compléments Européens / Quotidien générique
('Omelette (Oil)',          'Omelette (cuite avec huile)',         180, 12.0, 1.0, 14.0, 0.0, 'œuf'),
('Fried Egg',               'Œuf au plat (avec huile)',            190, 13.0, 1.0, 15.0, 0.0, 'œuf'),
('Scrambled Eggs',          'Œufs brouillés',                      160, 11.0, 2.0, 12.0, 0.0, 'œuf'),
('Canned Sardines Tomato',  'Sardines sauce tomate',               180, 18.0, 2.0, 11.0, 0.0, 'poisson'),
('Corned Beef',             'Corned Beef (Boîte)',                 250, 26.0, 0.0, 16.0, 0.0, 'viande'),
('Mayonnaise (Light)',      'Mayonnaise allégée',                  300,  1.0, 5.0, 30.0, 0.0, 'matière grasse'),
('Vinaigrette',             'Sauce vinaigrette classique',         450,  0.0, 2.0, 50.0, 0.0, 'sauce'),
('Baguette (White)',        'Baguette blanche classique',          270,  9.0,55.0,  1.5, 3.0, 'féculent'),
('Processed Cheese',        'Fromage fondu (Vache qui rit)',       240, 11.0, 5.0, 19.0, 0.0, 'fromage'),

-- ══════════ PACK #2 ══════════

-- 🇬🇦 Spécialités Gabonaises & Afrique Centrale
('Odika Sauce with Meat',   'Sauce Odika (Chocolat indigène + viande)',  280, 15.0,  5.0, 22.0, 4.0, 'plat'),
('Nkumu Leaves Peanut',     'Nkumu / Feuilles lianes (à l''arachide)',   160,  6.0,  8.0, 12.0, 5.0, 'plat'),
('Wild Meat Broth',         'Bouillon de viande sauvage (Porc-épic...)', 120, 18.0,  2.0,  4.0, 0.0, 'plat'),
('Mabanda (Smoked Fish)',   'Mabanda (Sardine/Poisson fumé dur)',        260, 28.0,  0.0, 16.0, 0.0, 'poisson'),
('Gari / Eba (Cooked)',     'Gari / Eba (Pâte de manioc cuite)',         140,  1.0, 33.0,  0.2, 1.5, 'féculent'),
('Coupe-Coupe',             'Coupe-Coupe (Viande braisée rue)',          250, 26.0,  2.0, 15.0, 0.0, 'viande'),
('Folere / Bissap Leaves',  'Sauce de feuilles de Foléré',               110,  4.0,  8.0,  7.0, 4.0, 'plat'),
('Pounded Yam',             'Igname pilée (Foufou d''igname)',           130,  1.5, 30.0,  0.2, 2.0, 'féculent'),
('Crushed Plantain',        'Plantain pilé',                             140,  1.2, 33.0,  0.3, 2.5, 'féculent'),

-- 🥔 Variations : Pommes de terre & Patates Douces
('Mashed Potatoes',         'Purée de pommes de terre (beurre/lait)',    105, 2.0, 15.0,  4.0, 1.5, 'féculent'),
('Pan-fried Potatoes',      'Pommes de terre sautées (à la poêle)',      135, 2.0, 20.0,  5.0, 2.0, 'féculent'),
('Baked Sweet Potato',      'Patate douce au four',                       90, 1.5, 20.0,  0.2, 3.0, 'féculent'),
('Sweet Potato Fries',      'Frites de patate douce',                    220, 2.0, 30.0, 10.0, 4.0, 'féculent'),
('Potato Gratin',           'Gratin dauphinois (crème/fromage)',         160, 4.0, 15.0,  9.0, 1.5, 'plat'),

-- 🍏 Variations : Pommes & Fruits préparés
('Applesauce (Sweet)',      'Compote de pomme (sucrée)',                  75, 0.2, 18.0, 0.1, 1.5, 'fruit'),
('Applesauce (Unsweet)',    'Compote de pomme (sans sucre ajouté)',       50, 0.2, 12.0, 0.1, 1.5, 'fruit'),
('Baked Apple',             'Pomme au four',                              65, 0.3, 15.0, 0.2, 2.4, 'fruit'),
('Fruit Salad',             'Salade de fruits frais',                     55, 0.5, 13.0, 0.2, 2.0, 'fruit'),

-- 🍝 Plats Internationaux & Quotidien
('Fried Rice',              'Riz sauté / Riz cantonais',                 180,  5.0, 25.0,  6.0, 1.0, 'plat'),
('Pasta Tomato Sauce',      'Pâtes sauce tomate',                        110,  4.0, 20.0,  1.5, 1.5, 'plat'),
('Pasta Carbonara',         'Pâtes Carbonara (crème/lardons)',           250,  9.0, 28.0, 11.0, 1.5, 'plat'),
('Caesar Salad',            'Salade César (avec sauce & poulet)',        190, 10.0,  8.0, 13.0, 2.0, 'plat'),
('Guacamole',               'Guacamole',                                 160,  2.0,  8.0, 14.0, 6.0, 'sauce'),
('Hummus',                  'Houmous',                                   170,  8.0, 14.0,  9.0, 6.0, 'sauce'),
('Pizza Margherita',        'Pizza Margherita (Classique)',              250, 10.0, 30.0, 10.0, 2.0, 'plat'),
('Beef Burger',             'Hamburger au boeuf (Fast food)',            270, 13.0, 28.0, 12.0, 1.5, 'plat'),
('Fried Chicken (Breaded)', 'Poulet frit pané (Fast food)',              290, 14.0, 15.0, 19.0, 1.0, 'viande'),
('Shawarma Sandwich',       'Sandwich Chawarma complet',                 230, 10.0, 22.0, 11.0, 2.0, 'plat'),
('Pancakes',                'Pancakes nature',                           220,  6.0, 35.0,  6.0, 1.0, 'sucre'),

-- ══════════ PACK #3 ══════════
-- Spécialités d'Afrique Centrale & de l'Ouest / Repas de la semaine
('Pork ribs (Cotis)',           'Cotis de porc',                         320, 20.0,  0.0, 26.0, 0.0, 'viande'),
('Cassava leaves (Saka-saka)',  'Saka-saka / Feuilles de manioc',        140,  4.0,  8.0, 10.0, 4.0, 'plat'),
('Amaranth leaves (Follon)',    'Follon préparé',                        130,  3.0,  5.0, 11.0, 3.0, 'plat'),
('Cassava stick (Chikwangue)',  'Chikwangue / Bâton de manioc',          160,  1.0, 38.0,  0.2, 2.0, 'féculent'),
('Fried plantain (Alloco)',     'Alloco / Plantains frits',              280,  1.0, 30.0, 17.0, 2.0, 'plat'),
('Bissap juice (sweetened)',    'Jus de Bissap (sucré)',                  25,  0.0,  6.0,  0.0, 0.0, 'boisson'),
('Frankfurter sausage',         'Saucisse type Knacki',                  270, 12.0,  2.0, 24.0, 0.0, 'viande'),
('Meat spread (Pâté)',          'Pâté',                                  300, 14.0,  2.0, 28.0, 0.0, 'viande'),
('Fried dough (Galette)',       'Galette frite',                         350,  5.0, 50.0, 15.0, 1.0, 'sucre'),
('Ketchup',                     'Ketchup',                               110,  1.0, 26.0,  0.1, 0.3, 'sauce'),
('Mustard',                     'Moutarde',                               66,  4.0,  5.0,  3.0, 2.0, 'sauce')

on conflict do nothing;

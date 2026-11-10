-- Demo catalogue for Velora. Safe to re-run: existing slugs are skipped.

insert into public.categories (name, slug, description) values
  ('Home & Living', 'home-living', 'Considered pieces for calm, well-kept spaces.'),
  ('Kitchen', 'kitchen', 'Tools and tableware that earn their place on the counter.'),
  ('Bags & Accessories', 'bags-accessories', 'Everyday carry, made to last.'),
  ('Wellness', 'wellness', 'Small rituals for slower mornings and evenings.'),
  ('Stationery', 'stationery', 'Paper goods and desk essentials.')
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, stock)
select c.id, p.name, p.slug, p.description, p.price, p.stock
from (values
  ('home-living', 'Linen Throw Blanket', 'linen-throw-blanket', 'Stonewashed pure linen throw with hand-knotted fringe. Breathable in warm months, layered in cool ones. 130 × 170 cm.', 38500, 14),
  ('home-living', 'Ceramic Table Lamp', 'ceramic-table-lamp', 'Hand-glazed ceramic base with a natural linen shade. Takes an E27 bulb; braided cotton cord with inline switch.', 54000, 6),
  ('home-living', 'Woven Storage Basket', 'woven-storage-basket', 'Seagrass basket woven by artisans in Oyo. Holds blankets, toys or laundry. 40 cm diameter.', 16500, 25),
  ('home-living', 'Scented Soy Candle — Cedar', 'scented-soy-candle-cedar', 'Slow-burning soy wax candle with notes of cedarwood, vetiver and smoked oak. Approx. 45 hour burn time.', 9800, 40),
  ('kitchen', 'Stoneware Dinner Set', 'stoneware-dinner-set', 'Four dinner plates, four side plates and four bowls in reactive matte glaze. Dishwasher and microwave safe.', 72000, 5),
  ('kitchen', 'Acacia Serving Board', 'acacia-serving-board', 'Solid acacia board with a carved handle for bread, cheese and grazing spreads. Finished with food-safe oil.', 14500, 18),
  ('kitchen', 'Pour-Over Coffee Set', 'pour-over-coffee-set', 'Borosilicate glass carafe with a stainless steel mesh filter. Brews up to 600 ml — no paper filters needed.', 21000, 12),
  ('kitchen', 'Cast Iron Skillet 26 cm', 'cast-iron-skillet-26cm', 'Pre-seasoned cast iron skillet for searing, baking and everything in between. Works on every hob, including induction.', 29500, 3),
  ('bags-accessories', 'Leather Weekender Bag', 'leather-weekender-bag', 'Full-grain leather holdall with brass hardware, a padded shoulder strap and an interior zip pocket. Ages beautifully.', 145000, 4),
  ('bags-accessories', 'Canvas Tote', 'canvas-tote', 'Heavyweight 16 oz cotton canvas tote with leather-reinforced handles and an inner pocket.', 12500, 30),
  ('bags-accessories', 'Minimal Card Wallet', 'minimal-card-wallet', 'Slim vegetable-tanned leather wallet holding up to six cards. Hand-stitched edges.', 15800, 0),
  ('wellness', 'Bamboo Bath Towel Set', 'bamboo-bath-towel-set', 'Two bath towels and two hand towels in ultra-soft bamboo-cotton blend. Quick drying and highly absorbent.', 34000, 10),
  ('wellness', 'Essential Oil Diffuser', 'essential-oil-diffuser', 'Ultrasonic diffuser with a ceramic cover, warm night light and auto shut-off. 300 ml tank.', 26500, 9),
  ('wellness', 'Shea Body Butter', 'shea-body-butter', 'Whipped unrefined shea butter with coconut oil and a hint of vanilla. 250 ml glass jar.', 7500, 50),
  ('stationery', 'Dot Grid Notebook A5', 'dot-grid-notebook-a5', 'Lay-flat linen-bound notebook, 192 numbered pages of 100 gsm paper. Fountain pen friendly.', 8900, 35),
  ('stationery', 'Brass Desk Organiser', 'brass-desk-organiser', 'Weighted brass tray with three compartments for pens, clips and keys.', 19500, 7)
) as p(category_slug, name, slug, description, price, stock)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;

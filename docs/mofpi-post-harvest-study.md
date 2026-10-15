# Ministry of Food Processing Industries (MoFPI) Post-Harvest Losses Study (2020–22)
## Benchmark Analysis, 54 Commodities, 15 Agro-Climatic Zones & FreshRoute SaaS Integration

---

## 1. Executive Summary & Policy Context

In India, harvest and post-harvest food loss represents one of the most severe structural challenges across the agricultural economy. To establish rigorous empirical benchmarks, the **Ministry of Food Processing Industries (MoFPI)**, Government of India, commissioned a nationwide study through **NABARD Consultancy Services Pvt. Ltd. (NABCONS)** titled:

> **“Study to Determine Post-Harvest Losses of Agri-Produce in India”** (Reference Period: 2020–2022).

This comprehensive assessment evaluates quantitative and qualitative food losses across **54 selected commodities** spanning **15 distinct Agro-Climatic Zones (ACZs)** and **292 districts** nationwide. The study updates earlier benchmark surveys conducted by the Indian Council of Agricultural Research – Central Institute of Post-Harvest Engineering and Technology (**ICAR-CIPHET**, 2015).

### Core Findings & Macroeconomic Impact
- **Annual Food Loss Valuation**: Estimated at **₹1,52,790 Crore (~$18.5 Billion USD)** annually across farm and market value chains.
- **Perishable Horticulture Vulnerability**: Fruits (up to **15.05%** in Guava) and Vegetables (up to **11.62%** in Tomato) suffer the highest quantitative losses due to lack of farm-gate pre-cooling, broken cold chains, and unconditioned transit.
- **Durable Grains & Pulses**: Cereals lose between **3.89% and 5.92%** (~12.49 Million MT), while Pulses lose **5.65% to 6.74%** (~1.37 Million MT), predominantly driven by traditional threshing, combine harvesting shattering, and farm-level storage pest attacks (bruchids/weevils).
- **Dairy vs. Perishable Contrast**: Bovine milk experiences only **0.87%** post-harvest loss, underscoring the transformative efficacy of organized, temperature-controlled village collection centers and bulk milk coolers (BMCs) developed under Operation Flood and NDDB.

---

## 2. Supply Chain Stages Evaluated

The study tracks quantitative weight loss, discard rates, and quality degradation across two primary segments of the agricultural value chain:

```
[ Farm-Gate Operations ]                                      [ Market-Level Channels ]
├── 1. Harvesting (Manual/Mechanical)                        ├── 7. Primary Transit & Haulage
├── 2. Collection & Assembly                                  ├── 8. Central Godowns / Warehouses
├── 3. Threshing / De-podding / Winnowing                     ├── 9. Wholesale APMC Mandis
├── 4. Field Curing & Solar Drying                            ├── 10. Secondary Inter-City Transport
├── 5. Sorting, Grading & Trimming                            ├── 11. Retail Displays & Dark Stores
└── 6. Farm-Level Storage (Khattis/Bags)                      └── 12. Processing Units & Commercial Kitchens
```

### Primary Loss Mechanisms:
1. **Mechanical Injury**: Abrasions, compression, and puncture during manual harvesting, rough sorting, and transit in non-cushioned wooden boxes or overpacked gunny sacks.
2. **Thermal & Respiration Shocks**: Lack of pre-cooling within 2 to 4 hours of harvest accelerates respiration rates ($Q_{10}$ effect), triggering rapid ethylene release and premature senescence.
3. **Biological & Microbial Decay**: Fungal rots (*Anthracnose*, *Botrytis*, *Penicillium*), soft rots (*Erwinia*), and insect infestation during storage under ambient humidity.
4. **Logistics & Transit Excursions**: Potholed rural roads, non-refrigerated open trucks, long transit delays, and multi-handling at APMC mandi yards.

---

## 3. Official 54 Commodities Post-Harvest Loss Master Dataset

Below is the complete dataset of all 54 commodities from Table 6 of the official MoFPI / NABCONS study (presented to the Rajya Sabha on August 1, 2025; PIB Delhi PRID 2151371):

### A. Cereals (5 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-PAD-01` | **Paddy (Rice)** | 4.16% | 0.61% | **4.77%** | 1,35,755 | Threshing spillage, field moisture mold, rodent attack in farm bins |
| `CMD-WHT-01` | **Wheat** | 3.61% | 0.56% | **4.17%** | 1,13,292 | Combine shatter, godown moisture migration, weevil infestation |
| `CMD-MAZ-01` | **Maize (Corn)** | 3.22% | 0.67% | **3.89%** | 35,910 | Crib storage rotting, moisture mold, aflatoxin contamination |
| `CMD-BAJ-01` | **Bajra (Pearl Millet)** | 3.59% | 0.78% | **4.37%** | 10,500 | Mud threshing yard contamination, grain spillage, summer rancidity |
| `CMD-SRG-01` | **Sorghum (Jowar)** | 4.75% | 1.17% | **5.92%** | 4,800 | Earhead insect damage, bird feeding, transit moisture absorption |

### B. Pulses (4 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-TUR-01` | **Pigeon Pea (Tur / Arhar)** | 4.67% | 0.99% | **5.66%** | 4,350 | Pod borer damage, splitting during manual podding, pulse beetle (bruchid) |
| `CMD-CHK-01` | **Chickpea (Gram / Chana)** | 5.89% | 0.85% | **6.74%** | 13,630 | Highest pulse loss: bruchid attack in traditional khattis, drying shatter |
| `CMD-MNG-01` | **Green Gram (Moong)** | 5.30% | 0.89% | **6.19%** | 3,680 | Non-synchronized pod maturity, field picking shatter, weevil holes |
| `CMD-URD-01` | **Black Gram (Urad)** | 4.95% | 0.88% | **5.83%** | 2,850 | Moisture absorption, pod splitting, mandi storage fungal mold |

### C. Oilseeds (6 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-MSD-01` | **Mustard / Rapeseed** | 4.08% | 0.38% | **4.46%** | 12,820 | Siliqua pod shattering in field, transit spillage from woven sacks |
| `CMD-CTN-01` | **Cottonseed** | 2.47% | 0.40% | **2.87%** | 10,500 | Lowest oilseed loss: ginning spillage, internal damp stack heating |
| `CMD-SOY-01` | **Soybean** | 6.58% | 0.93% | **7.51%** | 13,000 | Highest oilseed loss: combine pod dehiscence, seed coat cracking |
| `CMD-SAF-01` | **Safflower (Kardi)** | 2.66% | 0.40% | **3.06%** | 65 | Spiny head handling cuts, seed spillage, farm rodent feeding |
| `CMD-SUN-01` | **Sunflower** | 3.30% | 1.08% | **4.38%** | 280 | Bird feeding pre-harvest, head threshing damage, summer rancidity |
| `CMD-GNT-01` | **Groundnut (Peanut)** | 4.70% | 1.03% | **5.73%** | 10,200 | Pod detachment during soil lifting, *Aspergillus flavus* aflatoxin buildup |

### D. Fruits (11 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-APP-01` | **Apple** | 7.87% | 1.64% | **9.51%** | 2,589 | Hill terrain bruising, non-cushioned wooden boxes, non-reefer transit |
| `CMD-BAN-01` | **Banana** | 5.17% | 2.40% | **7.57%** | 34,528 | Bunch drop damage, finger drop, chilling injury (<12°C), retail over-ripening |
| `CMD-CTR-01` | **Citrus (Orange / Lime)** | 5.53% | 2.18% | **7.71%** | 14,000 | Stem puncture, green mold (*Penicillium*), peel desiccation in hot transit |
| `CMD-GRP-01` | **Grapes** | 5.09% | 2.05% | **7.14%** | 3,401 | Berry shatter, gray mold (*Botrytis*), lack of 4-hour pre-cooling |
| `CMD-GUA-01` | **Guava** | 11.59% | 3.46% | **15.05%** | 5,527 | **HIGHEST FRUIT LOSS**: delicate skin, climacteric peak, fruit fly punctures |
| `CMD-MGO-01` | **Mango** | 6.03% | 2.50% | **8.53%** | 20,772 | Sap burn at stem detachment, anthracnose spotting, ambient mandi softening |
| `CMD-PAP-01` | **Papaya** | 3.77% | 2.82% | **6.59%** | 5,341 | Skin scuffing, vibration liquefaction in trucks, stem-end rot |
| `CMD-SAP-01` | **Sapota (Chiku)** | 6.22% | 3.32% | **9.54%** | 941 | Rapid ripening within 72h, skin rupture under crate compression |
| `CMD-PNA-01` | **Pineapple** | 4.22% | 1.80% | **6.02%** | 1,851 | Black rot (*Ceratocystis*) at crown cuts, lowest fruit loss in survey |
| `CMD-POM-01` | **Pomegranate** | 4.09% | 2.73% | **6.82%** | 3,086 | Rind cracking, aril fungal decay, transport abrasion, retail drying |
| `CMD-MSK-01` | **Muskmelon** | 4.12% | 2.71% | **6.83%** | 1,498 | Slip-stage detachment injury, rapid pulp softening, retail surface rot |

### E. Vegetables (14 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-CAB-01` | **Cabbage** | 5.83% | 2.32% | **8.15%** | 9,825 | Outer leaf trimming waste, bacterial soft rot, head splitting in transit |
| `CMD-CAU-01` | **Cauliflower** | 5.76% | 2.13% | **7.89%** | 9,566 | Curd browning/yellowing, mechanical bruising in gunny bags, black rot |
| `CMD-PEA-01` | **Green Pea** | 4.67% | 1.76% | **6.43%** | 6,182 | Rapid sugar-to-starch conversion in ambient heat, pod yellowing |
| `CMD-MSH-01` | **Mushroom** | 6.21% | 0.99% | **7.20%** | 280 | Ultra-fast respiration, cap opening, moisture weeping, browning |
| `CMD-ONN-01` | **Onion** | 5.31% | 1.96% | **7.27%** | 31,687 | Inadequate field curing, neck rot, humid chawl sprouting and rotting |
| `CMD-POT-01` | **Potato** | 5.10% | 0.86% | **5.96%** | 56,176 | Mechanical slicing during digging, tuber moth, condensation rotting |
| `CMD-TOM-01` | **Tomato** | 8.37% | 3.25% | **11.62%** | 20,694 | **HIGHEST VEGETABLE LOSS**: skin bursting, transit crushing, market gluts |
| `CMD-TAP-01` | **Tapioca (Cassava)** | 3.39% | 1.48% | **4.87%** | 6,213 | Rapid physiological deterioration (PPD) within 48h; lowest veg loss % |
| `CMD-BGD-01` | **Bottle Gourd (Lauki)** | 4.69% | 2.32% | **7.01%** | 3,210 | Surface scarring, neck shrivel, yellowing under retail ambient light |
| `CMD-BRN-01` | **Brinjal (Eggplant)** | 4.75% | 2.66% | **7.41%** | 12,765 | Calyx browning, skin wrinkling, chilling injury if cooled below 8°C |
| `CMD-BNS-01` | **Beans (French / Cluster)** | 3.68% | 3.43% | **7.11%** | 2,726 | Snap breakage in flexible sacks, transpirational wilting, fiber toughening |
| `CMD-RAD-01` | **Radish** | 3.96% | 2.50% | **6.46%** | 3,214 | Foliage decay, root pithiness, rapid moisture shrinkage |
| `CMD-CAP-01` | **Capsicum (Bell Pepper)** | 2.60% | 2.55% | **5.15%** | 586 | Calyx detachment, botrytis rot, vibration abrasions, chilling injury |
| `CMD-OKR-01` | **Okra (Bhindi)** | 3.76% | 2.25% | **6.01%** | 6,873 | Pod tip snapping, blackening under poor ventilation, rapid fiber hardening |

### F. Plantation Crops and Spices (8 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-ARC-01` | **Areca Nut (Betel Nut)** | 3.58% | 0.83% | **4.41%** | 1,666 | De-husking injury, fungal discoloration during wet monsoon drying |
| `CMD-CSH-01` | **Cashew Nut (Raw)** | 3.11% | 0.61% | **3.72%** | 752 | Uncollected fallen nuts, damp storage mold, shell oil contamination |
| `CMD-CCN-01` | **Coconut (Mature Nut)** | 2.85% | 1.00% | **3.85%** | 13,317 | Nut cracking on drop, copra mold in damp holds, water evaporation |
| `CMD-SGC-01` | **Sugarcane** | 5.63% | 1.71% | **7.34%** | 4,39,425 | Sucrose inversion to reducing sugars within 48h; weighbridge queue driage |
| `CMD-BKP-01` | **Black Pepper** | 1.11% | 0.19% | **1.30%** | 95 | **LOWEST LOSS IN STUDY (1.30%)**: drying floor mold, bag spillage |
| `CMD-CHL-01` | **Chilli (Dry Red)** | 5.20% | 0.91% | **6.11%** | 1,836 | Sun bleaching, aflatoxin buildup during humid drying, pod breakage |
| `CMD-COR-01` | **Coriander Seed** | 4.72% | 0.60% | **5.32%** | 735 | Mericarp splitting during threshing, essential oil volatile loss in heat |
| `CMD-TRM-01` | **Turmeric (Cured)** | 3.78% | 1.57% | **5.35%** | 1,222 | Boiling/curing damage, curcumin photo-degradation, store bore insects |

### G. Dairy, Meat, Poultry, Fisheries & Eggs (6 Commodities)
| Commodity Code | Crop / Commodity | Loss in Farm Operations (%) | Loss at Market Level (%) | Total Post-Harvest Loss (%) | National Production ('000 MT) | Primary Loss Drivers |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `CMD-MLK-01` | **Milk (Bovine)** | 0.54% | 0.33% | **0.87%** | 2,30,580 | Souring during chilling delays; lowest loss due to dairy cooperative chains |
| `CMD-FSH-INL-01` | **Inland Fisheries** | 3.80% | 1.06% | **4.86%** | 13,110 | Delayed pond-side icing, non-insulated transport, autolytic spoilage |
| `CMD-FSH-MAR-01` | **Marine Fisheries** | 7.00% | 1.76% | **8.76%** | 4,430 | High marine loss: onboard ice shortage on deep trawlers, dock congestion |
| `CMD-MET-01` | **Meat (Mutton / Chevon / Beef)** | 1.43% | 0.91% | **2.34%** | 9,770 | Non-refrigerated slaughterhouses, microbial growth, transit heat spikes |
| `CMD-PLT-01` | **Poultry Meat** | 2.51% | 3.12% | **5.63%** | 4,780 | Live crate transit mortality, evisceration contamination, drip loss |
| `CMD-EGG-01` | **Egg (Layer Poultry)** | 4.40% | 1.63% | **6.03%** | 7,363 | Road vibration shell cracking in paper trays, albumen thinning in heat |

---

## 4. The 15 Agro-Climatic Zones of India & Cold Chain Gaps

The Planning Commission and ICAR divided India into 15 broad agro-climatic zones based on physiography, soil, rainfall, and thermal regimes. FreshRoute provisions strategic cold hubs in each zone:

| Zone Code | Zone Name | Geographical Coverage | Post-Harvest Vulnerability | Key Commodities | Strategic Cold Hub | Primary Infrastructure Bottlenecks |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **Zone I** | Western Himalayan Region | J&K, Ladakh, HP, Uttarakhand | **HIGH** | Apple, Mushroom, Walnut, Pear | Shimla (`DC-AZ01-SHI`) | Mountain road transit delays; critical deficit of farm-gate CA stores |
| **Zone II** | Eastern Himalayan Region | Assam, NE States, North Bengal | **HIGH** | Pineapple, Banana, Ginger, Fish | Guwahati (`DC-AZ02-GUW`) | High humidity mold; transport delays along Siliguri corridor |
| **Zone III** | Lower Gangetic Plain | West Bengal Plains | **MEDIUM** | Paddy, Potato, Fish, Cabbage | Kolkata (`DC-AZ03-KOL`) | Seasonal potato cold store gluts; landing ghat fish icing deficits |
| **Zone IV** | Middle Gangetic Plain | Eastern UP, Bihar | **CRITICAL** | Tomato, Guava, Litchi, Mango | Varanasi (`DC-AZ04-VAR`) | Extreme summer heat (>44°C); acute farm-gate pre-cooling deficit |
| **Zone V** | Upper Gangetic Plain | Western & Central UP | **MEDIUM** | Sugarcane, Potato, Mustard, Milk | Greater Noida (`DC-AZ05-NOI`) | Sucrose inversion in mill queues; milk chilling route delays |
| **Zone VI** | Trans-Gangetic Plain | Punjab, Haryana, Delhi NCR | **MEDIUM** | Wheat, Paddy, Kinnow, Poultry | Kundli NCR (`DC-AZ06-DEL`) | Seasonal citrus glut; milk reefer scheduling bottlenecks |
| **Zone VII** | Eastern Plateau & Hills | Jharkhand, Chhattisgarh, Odisha | **HIGH** | Tomato, Okra, Turmeric, Fish | Raipur (`DC-AZ07-RAI`) | Distress sales by tribal farmers; lack of decentralized packhouses |
| **Zone VIII**| Central Plateau & Hills | Madhya Pradesh, Bundelkhand | **MEDIUM** | Soybean, Chickpea, Garlic, Guava | Indore (`DC-AZ08-IND`) | Soybean threshing mold; chickpea bruchid vulnerability in godowns |
| **Zone IX** | Western Plateau & Hills | Maharashtra (Nashik/Pune/Solapur) | **CRITICAL** | Grapes, Onion, Pomegranate, Banana| Nashik (`DC-AZ09-NAS`) | Highest horticulture concentration; onion rotting in traditional chawls |
| **Zone X** | Southern Plateau & Hills | Telangana, Rayalaseema, Karnataka | **HIGH** | Mango, Tomato, Chilli, Poultry | Bengaluru (`DC-AZ10-BLR`) | Intense dry heat desiccation; inter-district tomato transit crushing |
| **Zone XI** | East Coast Plains & Hills| Coastal AP, Odisha, Coastal TN | **HIGH** | Marine Fish, Banana, Coconut | Visakhapatnam (`DC-AZ11-VIZ`) | Cyclone hazards, high coastal ambient humidity accelerates fish rot |
| **Zone XII** | West Coast Plains & Ghats| Coastal MH, Goa, Coastal KA, KL | **MEDIUM** | Marine Fish, Pepper, Arecanut | Kochi (`DC-AZ12-KOC`) | Heavy monsoon prevents sun-drying; wharf cold storage deficits |
| **Zone XIII**| Gujarat Plains & Hills | Gujarat, Daman, Diu | **MEDIUM** | Groundnut, Cumin, Potato, Milk | Ahmedabad (`DC-AZ13-AHM`) | High thermal summer stress; reefer vehicle maintenance compliance |
| **Zone XIV** | Western Dry Region | Western Rajasthan (Thar Desert) | **CRITICAL** | Bajra, Cumin, Coriander, Guar | Jodhpur (`DC-AZ14-JOD`) | Extreme 50°C summer heat; ultra-long transit to consumption centers |
| **Zone XV** | The Island Region | Andaman & Nicobar, Lakshadweep | **CRITICAL** | Coconut, Marine Fish, Pineapple | Port Blair (`DC-AZ15-PBL`) | Geographic maritime isolation; total dependence on sea/air cold-chain |

---

## 5. How FreshRoute Solves the Post-Harvest Problem

FreshRoute transforms the empirical findings of the MoFPI study into actionable, automated distribution plans:

### 1. Eliminating the FIFO Failure Mode
Traditional ERP systems dispatch batches using First-In, First-Out (FIFO). In perishables like Tomato (11.62% loss) or Guava (15.05% loss), harvest temperature history, initial microbial load, and reefer transit conditions dictate that the oldest batch is often not the optimal batch to ship.
FreshRoute models absolute remaining shelf-life at arrival dock:
$$T_{\text{arrival}} = T_{\text{departure}} + \Delta t_{\text{handling}} + \Delta t_{\text{transit}} + \Delta t_{\text{buffer}}$$
$$RSL_{\text{arrival}} = T_{\text{expiry}} - T_{\text{arrival}}$$

If $RSL_{\text{arrival}} < \text{SLA}_{\text{min}}$, the allocation engine preemptively flags the shipment as infeasible (`REJECTED_INSUFFICIENT_SHELF_LIFE`), preventing costly retail rejections and disposal fees at supermarket loading docks.

### 2. Calibrated Decay Exponent ($\alpha$) Based on MoFPI Findings
Perishables degrade exponentially as storage temperature deviates from optimal cold-chain setpoints:
$$\text{Decay Rate} = e^{\alpha \cdot \Delta T}$$
FreshRoute configures the decay exponent ($\alpha$) directly from the MoFPI study:
- **Ultra-Perishables** (Guava $\alpha=1.90$, Tomato $\alpha=1.75$, Mushroom $\alpha=1.85$, Marine Fish $\alpha=1.90$): Require tight reefer temperature bands and immediate FEFO priority dispatch.
- **Semi-Perishables** (Pomegranate $\alpha=1.28$, Citrus $\alpha=1.40$, Apple $\alpha=1.35$): Tolerate short buffer windows and controlled routing.
- **Durable Staples** (Wheat $\alpha=1.08$, Paddy $\alpha=1.10$, Mustard $\alpha=1.11$): Optimized for high-capacity freight consolidation.

### 3. Dynamic Markdowns Salvage Engine
Instead of absorbing a 100% loss write-off on near-expiry batches, FreshRoute matches at-risk inventory with secondary buyers (food service processors, discount grocers, institutional kitchens) that have lower shelf-life thresholds (e.g. 1 to 2 days) and accept dynamic discounts, converting potential waste into operating profit while respecting margin floors.

---

## 6. Generated SaaS CSV Datasets & Ingest Guide

All generated CSV files are stored in `data/mofpi-post-harvest/` and are fully validated against FreshRoute's RFC-4180 parser and Zod schemas:

| File Name | Purpose | Target FreshRoute Schema / Table | Record Count |
| :--- | :--- | :--- | :---: |
| `mofpi_54_commodities_post_harvest_losses.csv` | Master national research dataset with loss breakdowns, temperatures, shelf lives, and production volumes | Analytical Reference Ledger | 54 Rows |
| `mofpi_15_agro_climatic_zones_india.csv` | Official Indian Agro-Climatic Zones with vulnerability ratings, climate, and cold-chain deficit profiles | Regional Zone Master | 15 Rows |
| `freshroute_mofpi_zone_commodity_matrix.csv` | Cross-mapping matrix of zones to commodities with FreshRoute projected loss reduction and salvage rates | Scenario Lab / Optimizer Matrix | 103 Rows |
| `freshroute_india_commodities_catalog.csv` | Production commodity catalog matching FreshRoute's relational database schema | `Commodity` Table | 54 Rows |
| `freshroute_india_warehouses.csv` | Strategic cold-chain distribution terminals situated across the 15 Agro-Climatic Zones | `Warehouse` Table | 15 Rows |
| `freshroute_inventory_mofpi_data.csv` | Active inventory batches of Indian produce ready for FEFO distribution | `InventoryCsvRowSchema` | 15 Batches |
| `freshroute_destinations_demand_mofpi_data.csv` | Commercial demand orders from major Indian retail & processing buyers with strict SLAs | `DestinationDemandCsvRowSchema` | 10 Orders |
| `freshroute_transport_routes_mofpi_data.csv` | Refrigerated transit routes across Indian inter-zone logistics corridors | `TransportCsvRowSchema` | 6 Routes |

### How to Ingest via FreshRoute UI & API:
1. **Catalog & Warehouses Seeding**:
   Use `seedMofpiProduceNetwork(orgId)` from `src/server/services/mofpi-data.service.ts` to register the 54 commodities and 15 warehouses.
2. **Uploading Operational CSVs**:
   - In FreshRoute UI: Navigate to **Operations Cockpit > CSV Import** (`/app/inventory` or `/app/destinations` or `/app/transport`).
   - Drag & drop `freshroute_inventory_mofpi_data.csv` under **Inventory Import**.
   - Review validation preview (0 errors, 100% valid).
   - Click **Commit Import** to persist live batches.
3. **Execute Planning Optimization**:
   - Navigate to `/app/planning`.
   - Click **Generate Distribution Plan**.
   - Inspect the Baseline (FIFO) vs. FreshRoute (FEFO) comparison table, showcasing spoilage reduction, SLA compliance uplift, and margin preservation.

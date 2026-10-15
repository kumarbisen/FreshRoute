"""
MoFPI Post-Harvest Loss Dataset & FreshRoute SaaS Data Generator
Based on India Ministry of Food Processing Industries (MoFPI) / NABCONS Study (2020-22 Reference Period)
Covering 54 commodities across 15 agro-climatic zones of India.
"""

import os
import csv
import re
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "mofpi-post-harvest")
os.makedirs(DATA_DIR, exist_ok=True)

# --------------------------------------------------------------------------
# 1. 54 COMMODITIES MASTER POST-HARVEST LOSS DATASET
# --------------------------------------------------------------------------
# Source: MoFPI & NABCONS Study (2020-22), Rajya Sabha Written Reply & PIB PRID 2151371
COMMODITIES_54 = [
    # Cereals (5)
    {
        "code": "CMD-PAD-01", "name": "Paddy (Rice)", "category": "CEREALS",
        "farm_loss": 4.16, "market_loss": 0.61, "total_loss": 4.77,
        "production_kmt": 135755, "opt_temp": "15.0 - 20.0", "opt_humidity": "60 - 70%",
        "ambient_shelf_days": 180, "cold_shelf_days": 365, "decay_exp": 1.10,
        "price_usd": 0.42, "cost_usd": 0.28, "waste_disp_usd": 0.05,
        "loss_drivers": "Threshing spillage, moisture mold during field drying, farm-bin rodent damage",
        "zones": "Zone II, Zone III, Zone IV, Zone V, Zone VI, Zone VII, Zone X, Zone XI"
    },
    {
        "code": "CMD-WHT-01", "name": "Wheat", "category": "CEREALS",
        "farm_loss": 3.61, "market_loss": 0.56, "total_loss": 4.17,
        "production_kmt": 113292, "opt_temp": "12.0 - 15.0", "opt_humidity": "60 - 65%",
        "ambient_shelf_days": 240, "cold_shelf_days": 400, "decay_exp": 1.08,
        "price_usd": 0.38, "cost_usd": 0.26, "waste_disp_usd": 0.04,
        "loss_drivers": "Combine shatter loss, moisture migration in godowns, weevil infestation",
        "zones": "Zone IV, Zone V, Zone VI, Zone VIII, Zone IX, Zone XIII"
    },
    {
        "code": "CMD-MAZ-01", "name": "Maize (Corn)", "category": "CEREALS",
        "farm_loss": 3.22, "market_loss": 0.67, "total_loss": 3.89,
        "production_kmt": 35910, "opt_temp": "10.0 - 15.0", "opt_humidity": "65 - 70%",
        "ambient_shelf_days": 150, "cold_shelf_days": 300, "decay_exp": 1.12,
        "price_usd": 0.32, "cost_usd": 0.22, "waste_disp_usd": 0.04,
        "loss_drivers": "Harvest moisture retention, aflatoxin contamination, crib storage rotting",
        "zones": "Zone VII, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-BAJ-01", "name": "Bajra (Pearl Millet)", "category": "CEREALS",
        "farm_loss": 3.59, "market_loss": 0.78, "total_loss": 4.37,
        "production_kmt": 10500, "opt_temp": "15.0 - 22.0", "opt_humidity": "50 - 60%",
        "ambient_shelf_days": 180, "cold_shelf_days": 365, "decay_exp": 1.09,
        "price_usd": 0.35, "cost_usd": 0.24, "waste_disp_usd": 0.03,
        "loss_drivers": "Manual threshing yard dust mixing, grain spillage, humidity rancidity",
        "zones": "Zone VI, Zone VIII, Zone XIII, Zone XIV"
    },
    {
        "code": "CMD-SRG-01", "name": "Sorghum (Jowar)", "category": "CEREALS",
        "farm_loss": 4.75, "market_loss": 1.17, "total_loss": 5.92,
        "production_kmt": 4800, "opt_temp": "15.0 - 20.0", "opt_humidity": "55 - 65%",
        "ambient_shelf_days": 180, "cold_shelf_days": 365, "decay_exp": 1.14,
        "price_usd": 0.40, "cost_usd": 0.27, "waste_disp_usd": 0.04,
        "loss_drivers": "Earhead pest infestation, bird damage, transit moisture absorption",
        "zones": "Zone VIII, Zone IX, Zone X, Zone XIII"
    },

    # Pulses (4)
    {
        "code": "CMD-TUR-01", "name": "Pigeon Pea (Tur / Arhar)", "category": "PULSES",
        "farm_loss": 4.67, "market_loss": 0.99, "total_loss": 5.66,
        "production_kmt": 4350, "opt_temp": "15.0 - 18.0", "opt_humidity": "55 - 65%",
        "ambient_shelf_days": 180, "cold_shelf_days": 360, "decay_exp": 1.18,
        "price_usd": 1.25, "cost_usd": 0.88, "waste_disp_usd": 0.08,
        "loss_drivers": "Pod borer damage at harvest, splitting during manual de-podding, pulse beetle (bruchid) storage infestation",
        "zones": "Zone VII, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-CHK-01", "name": "Chickpea (Gram / Chana)", "category": "PULSES",
        "farm_loss": 5.89, "market_loss": 0.85, "total_loss": 6.74,
        "production_kmt": 13630, "opt_temp": "12.0 - 16.0", "opt_humidity": "55 - 60%",
        "ambient_shelf_days": 210, "cold_shelf_days": 420, "decay_exp": 1.22,
        "price_usd": 0.95, "cost_usd": 0.68, "waste_disp_usd": 0.06,
        "loss_drivers": "Highest pulse loss: bruchid attack in traditional khattis, shatter during sun drying, gunny bag tearing",
        "zones": "Zone IV, Zone V, Zone VI, Zone VIII, Zone IX, Zone XIII"
    },
    {
        "code": "CMD-MNG-01", "name": "Green Gram (Moong)", "category": "PULSES",
        "farm_loss": 5.30, "market_loss": 0.89, "total_loss": 6.19,
        "production_kmt": 3680, "opt_temp": "15.0 - 18.0", "opt_humidity": "55 - 60%",
        "ambient_shelf_days": 150, "cold_shelf_days": 300, "decay_exp": 1.20,
        "price_usd": 1.15, "cost_usd": 0.82, "waste_disp_usd": 0.07,
        "loss_drivers": "Non-synchronized pod maturity, shattering during field picking, weevil infestation",
        "zones": "Zone VI, Zone VIII, Zone IX, Zone X, Zone XIII, Zone XIV"
    },
    {
        "code": "CMD-URD-01", "name": "Black Gram (Urad)", "category": "PULSES",
        "farm_loss": 4.95, "market_loss": 0.88, "total_loss": 5.83,
        "production_kmt": 2850, "opt_temp": "15.0 - 18.0", "opt_humidity": "55 - 60%",
        "ambient_shelf_days": 150, "cold_shelf_days": 300, "decay_exp": 1.19,
        "price_usd": 1.20, "cost_usd": 0.85, "waste_disp_usd": 0.07,
        "loss_drivers": "Moisture absorption, pod splitting, mandi storage fungal development",
        "zones": "Zone IV, Zone VII, Zone VIII, Zone IX, Zone X, Zone XI"
    },

    # Oilseeds (6)
    {
        "code": "CMD-MSD-01", "name": "Mustard / Rapeseed", "category": "OILSEEDS",
        "farm_loss": 4.08, "market_loss": 0.38, "total_loss": 4.46,
        "production_kmt": 12820, "opt_temp": "10.0 - 15.0", "opt_humidity": "50 - 60%",
        "ambient_shelf_days": 180, "cold_shelf_days": 360, "decay_exp": 1.11,
        "price_usd": 0.85, "cost_usd": 0.60, "waste_disp_usd": 0.05,
        "loss_drivers": "Siliqua pod shattering in field, transit spillage from woven bags, enzymatic oil rancidity",
        "zones": "Zone V, Zone VI, Zone VIII, Zone XIII, Zone XIV"
    },
    {
        "code": "CMD-CTN-01", "name": "Cottonseed", "category": "OILSEEDS",
        "farm_loss": 2.47, "market_loss": 0.40, "total_loss": 2.87,
        "production_kmt": 10500, "opt_temp": "15.0 - 22.0", "opt_humidity": "50 - 65%",
        "ambient_shelf_days": 180, "cold_shelf_days": 360, "decay_exp": 1.05,
        "price_usd": 0.45, "cost_usd": 0.30, "waste_disp_usd": 0.04,
        "loss_drivers": "Ginning spillage, internal heating in damp stacks, free fatty acid elevation",
        "zones": "Zone VI, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-SOY-01", "name": "Soybean", "category": "OILSEEDS",
        "farm_loss": 6.58, "market_loss": 0.93, "total_loss": 7.51,
        "production_kmt": 13000, "opt_temp": "12.0 - 18.0", "opt_humidity": "55 - 65%",
        "ambient_shelf_days": 150, "cold_shelf_days": 300, "decay_exp": 1.25,
        "price_usd": 0.65, "cost_usd": 0.45, "waste_disp_usd": 0.06,
        "loss_drivers": "Highest oilseed loss: combine pod dehiscence, mechanical impact splits seed coats, storage mold",
        "zones": "Zone VII, Zone VIII, Zone IX, Zone XIII"
    },
    {
        "code": "CMD-SAF-01", "name": "Safflower (Kardi)", "category": "OILSEEDS",
        "farm_loss": 2.66, "market_loss": 0.40, "total_loss": 3.06,
        "production_kmt": 65, "opt_temp": "15.0 - 20.0", "opt_humidity": "50 - 60%",
        "ambient_shelf_days": 180, "cold_shelf_days": 360, "decay_exp": 1.06,
        "price_usd": 0.80, "cost_usd": 0.55, "waste_disp_usd": 0.05,
        "loss_drivers": "Spiny head handling damage, small grain spillage, localized storage rodents",
        "zones": "Zone IX, Zone X"
    },
    {
        "code": "CMD-SUN-01", "name": "Sunflower", "category": "OILSEEDS",
        "farm_loss": 3.30, "market_loss": 1.08, "total_loss": 4.38,
        "production_kmt": 280, "opt_temp": "12.0 - 18.0", "opt_humidity": "50 - 60%",
        "ambient_shelf_days": 150, "cold_shelf_days": 300, "decay_exp": 1.13,
        "price_usd": 0.75, "cost_usd": 0.52, "waste_disp_usd": 0.05,
        "loss_drivers": "Bird feeding pre-harvest, head threshing damage, rancidity in high summer temperatures",
        "zones": "Zone VIII, Zone IX, Zone X"
    },
    {
        "code": "CMD-GNT-01", "name": "Groundnut (Peanut)", "category": "OILSEEDS",
        "farm_loss": 4.70, "market_loss": 1.03, "total_loss": 5.73,
        "production_kmt": 10200, "opt_temp": "8.0 - 12.0", "opt_humidity": "55 - 65%",
        "ambient_shelf_days": 120, "cold_shelf_days": 270, "decay_exp": 1.21,
        "price_usd": 0.90, "cost_usd": 0.62, "waste_disp_usd": 0.06,
        "loss_drivers": "Pod detachment during soil lifting, aflatoxin (Aspergillus flavus) buildup during field curing, pod breakage",
        "zones": "Zone VIII, Zone IX, Zone X, Zone XI, Zone XIII"
    },

    # Fruits (11)
    {
        "code": "CMD-APP-01", "name": "Apple", "category": "FRUITS",
        "farm_loss": 7.87, "market_loss": 1.64, "total_loss": 9.51,
        "production_kmt": 2589, "opt_temp": "0.0 - 2.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 14, "cold_shelf_days": 180, "decay_exp": 1.35,
        "price_usd": 1.80, "cost_usd": 1.15, "waste_disp_usd": 0.15,
        "loss_drivers": "Bruising during manual hill harvest, packaging in non-cushioned wooden boxes, long ambient transit without reefers",
        "zones": "Zone I"
    },
    {
        "code": "CMD-BAN-01", "name": "Banana", "category": "FRUITS",
        "farm_loss": 5.17, "market_loss": 2.40, "total_loss": 7.57,
        "production_kmt": 34528, "opt_temp": "13.0 - 14.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 6, "cold_shelf_days": 24, "decay_exp": 1.55,
        "price_usd": 0.55, "cost_usd": 0.32, "waste_disp_usd": 0.08,
        "loss_drivers": "Bunch dropping during field harvest, finger detachment, chilling injury if cooled <12 C, wholesale over-ripening",
        "zones": "Zone II, Zone III, Zone X, Zone XI, Zone XII, Zone XIII"
    },
    {
        "code": "CMD-CTR-01", "name": "Citrus (Mandarin / Orange / Lime)", "category": "FRUITS",
        "farm_loss": 5.53, "market_loss": 2.18, "total_loss": 7.71,
        "production_kmt": 14000, "opt_temp": "5.0 - 8.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 12, "cold_shelf_days": 45, "decay_exp": 1.40,
        "price_usd": 0.70, "cost_usd": 0.42, "waste_disp_usd": 0.10,
        "loss_drivers": "Stem puncture, green mold (Penicillium digitatum), moisture loss/peel shrivel in hot transit",
        "zones": "Zone I, Zone VI, Zone VIII, Zone IX, Zone X"
    },
    {
        "code": "CMD-GRP-01", "name": "Grapes", "category": "FRUITS",
        "farm_loss": 5.09, "market_loss": 2.05, "total_loss": 7.14,
        "production_kmt": 3401, "opt_temp": "-0.5 - 1.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 4, "cold_shelf_days": 45, "decay_exp": 1.60,
        "price_usd": 1.40, "cost_usd": 0.88, "waste_disp_usd": 0.12,
        "loss_drivers": "Berry shatter, gray mold (Botrytis cinerea), stem browning without pre-cooling within 4 hours",
        "zones": "Zone IX, Zone X"
    },
    {
        "code": "CMD-GUA-01", "name": "Guava", "category": "FRUITS",
        "farm_loss": 11.59, "market_loss": 3.46, "total_loss": 15.05,
        "production_kmt": 5527, "opt_temp": "8.0 - 10.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 3, "cold_shelf_days": 18, "decay_exp": 1.90,
        "price_usd": 0.65, "cost_usd": 0.35, "waste_disp_usd": 0.12,
        "loss_drivers": "HIGHEST FRUIT LOSS (15.05%): thin skin, climacteric respiration surge, fruit fly puncture, rapid flesh softening",
        "zones": "Zone IV, Zone V, Zone VIII, Zone IX, Zone XIII"
    },
    {
        "code": "CMD-MGO-01", "name": "Mango", "category": "FRUITS",
        "farm_loss": 6.03, "market_loss": 2.50, "total_loss": 8.53,
        "production_kmt": 20772, "opt_temp": "12.0 - 13.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 7, "cold_shelf_days": 25, "decay_exp": 1.50,
        "price_usd": 1.10, "cost_usd": 0.65, "waste_disp_usd": 0.12,
        "loss_drivers": "Late harvest latex burn, sap burn, anthracnose black spots, pulp softening in ambient mandis",
        "zones": "Zone IV, Zone V, Zone IX, Zone X, Zone XI, Zone XIII"
    },
    {
        "code": "CMD-PAP-01", "name": "Papaya", "category": "FRUITS",
        "farm_loss": 3.77, "market_loss": 2.82, "total_loss": 6.59,
        "production_kmt": 5341, "opt_temp": "10.0 - 12.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 4, "cold_shelf_days": 21, "decay_exp": 1.58,
        "price_usd": 0.45, "cost_usd": 0.26, "waste_disp_usd": 0.08,
        "loss_drivers": "Skin scuffing during picking, vibration liquefaction in overloaded trucks, fungal stem-end rot",
        "zones": "Zone VII, Zone VIII, Zone IX, Zone X, Zone XI, Zone XIII"
    },
    {
        "code": "CMD-SAP-01", "name": "Sapota (Chiku)", "category": "FRUITS",
        "farm_loss": 6.22, "market_loss": 3.32, "total_loss": 9.54,
        "production_kmt": 941, "opt_temp": "12.0 - 14.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 3, "cold_shelf_days": 16, "decay_exp": 1.70,
        "price_usd": 0.60, "cost_usd": 0.36, "waste_disp_usd": 0.10,
        "loss_drivers": "Extremely fast ripening, skin rupture under compression, latex staining",
        "zones": "Zone IX, Zone X, Zone XI, Zone XII, Zone XIII"
    },
    {
        "code": "CMD-PNA-01", "name": "Pineapple", "category": "FRUITS",
        "farm_loss": 4.22, "market_loss": 1.80, "total_loss": 6.02,
        "production_kmt": 1851, "opt_temp": "7.0 - 10.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 8, "cold_shelf_days": 28, "decay_exp": 1.30,
        "price_usd": 0.75, "cost_usd": 0.45, "waste_disp_usd": 0.10,
        "loss_drivers": "Black rot (Ceratocystis paradoxa) at crown cuts, transit bruising, lowest loss among studied fruits",
        "zones": "Zone II, Zone III, Zone XI, Zone XII, Zone XV"
    },
    {
        "code": "CMD-POM-01", "name": "Pomegranate", "category": "FRUITS",
        "farm_loss": 4.09, "market_loss": 2.73, "total_loss": 6.82,
        "production_kmt": 3086, "opt_temp": "5.0 - 6.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 18, "cold_shelf_days": 75, "decay_exp": 1.28,
        "price_usd": 1.50, "cost_usd": 0.95, "waste_disp_usd": 0.14,
        "loss_drivers": "Rind cracking, aril rot, transit vibration abrasion, retail skin desiccation",
        "zones": "Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-MSK-01", "name": "Muskmelon", "category": "FRUITS",
        "farm_loss": 4.12, "market_loss": 2.71, "total_loss": 6.83,
        "production_kmt": 1498, "opt_temp": "3.0 - 5.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 4, "cold_shelf_days": 18, "decay_exp": 1.62,
        "price_usd": 0.40, "cost_usd": 0.24, "waste_disp_usd": 0.08,
        "loss_drivers": "Slip stage detachment damage, flesh softening under hot weather, retail surface mold",
        "zones": "Zone IV, Zone V, Zone VI, Zone XIII, Zone XIV"
    },

    # Vegetables (14)
    {
        "code": "CMD-CAB-01", "name": "Cabbage", "category": "VEGETABLES",
        "farm_loss": 5.83, "market_loss": 2.32, "total_loss": 8.15,
        "production_kmt": 9825, "opt_temp": "0.0 - 2.0", "opt_humidity": "95 - 98%",
        "ambient_shelf_days": 6, "cold_shelf_days": 45, "decay_exp": 1.45,
        "price_usd": 0.30, "cost_usd": 0.16, "waste_disp_usd": 0.06,
        "loss_drivers": "Outer leaf trimming waste, bacterial soft rot, head splitting in transit",
        "zones": "Zone I, Zone II, Zone III, Zone IV, Zone VII, Zone VIII, Zone IX, Zone X"
    },
    {
        "code": "CMD-CAU-01", "name": "Cauliflower", "category": "VEGETABLES",
        "farm_loss": 5.76, "market_loss": 2.13, "total_loss": 7.89,
        "production_kmt": 9566, "opt_temp": "0.0 - 2.0", "opt_humidity": "95 - 98%",
        "ambient_shelf_days": 4, "cold_shelf_days": 24, "decay_exp": 1.55,
        "price_usd": 0.42, "cost_usd": 0.24, "waste_disp_usd": 0.08,
        "loss_drivers": "Curd browning/yellowing under light and ambient heat, bruising in gunny bags, black rot",
        "zones": "Zone I, Zone III, Zone IV, Zone V, Zone VI, Zone VII, Zone VIII"
    },
    {
        "code": "CMD-PEA-01", "name": "Green Pea", "category": "VEGETABLES",
        "farm_loss": 4.67, "market_loss": 1.76, "total_loss": 6.43,
        "production_kmt": 6182, "opt_temp": "0.0 - 1.0", "opt_humidity": "95 - 98%",
        "ambient_shelf_days": 3, "cold_shelf_days": 18, "decay_exp": 1.72,
        "price_usd": 0.80, "cost_usd": 0.48, "waste_disp_usd": 0.10,
        "loss_drivers": "Sugar to starch rapid conversion in ambient heat, pod yellowing, weight loss from transpiration",
        "zones": "Zone I, Zone IV, Zone V, Zone VI, Zone VIII"
    },
    {
        "code": "CMD-MSH-01", "name": "Mushroom (Button / Oyster)", "category": "VEGETABLES",
        "farm_loss": 6.21, "market_loss": 0.99, "total_loss": 7.20,
        "production_kmt": 280, "opt_temp": "1.0 - 3.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 2, "cold_shelf_days": 10, "decay_exp": 1.85,
        "price_usd": 2.20, "cost_usd": 1.40, "waste_disp_usd": 0.20,
        "loss_drivers": "Extreme metabolic respiration, cap opening, veiling loss, enzymatic browning, moisture exudation",
        "zones": "Zone I, Zone V, Zone VI, Zone VII, Zone X"
    },
    {
        "code": "CMD-ONN-01", "name": "Onion", "category": "VEGETABLES",
        "farm_loss": 5.31, "market_loss": 1.96, "total_loss": 7.27,
        "production_kmt": 31687, "opt_temp": "0.0 - 2.0", "opt_humidity": "65 - 70%",
        "ambient_shelf_days": 30, "cold_shelf_days": 180, "decay_exp": 1.25,
        "price_usd": 0.35, "cost_usd": 0.18, "waste_disp_usd": 0.05,
        "loss_drivers": "Field curing deficits, neck rot, sprouting under humid storage, bulb rotting in traditional chawls",
        "zones": "Zone VI, Zone VIII, Zone IX, Zone X, Zone XIII, Zone XIV"
    },
    {
        "code": "CMD-POT-01", "name": "Potato", "category": "VEGETABLES",
        "farm_loss": 5.10, "market_loss": 0.86, "total_loss": 5.96,
        "production_kmt": 56176, "opt_temp": "8.0 - 10.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 35, "cold_shelf_days": 240, "decay_exp": 1.20,
        "price_usd": 0.28, "cost_usd": 0.15, "waste_disp_usd": 0.04,
        "loss_drivers": "Mechanical cuts during digger harvest, tuber moth infestation, rotting during cold store loading/unloading",
        "zones": "Zone III, Zone IV, Zone V, Zone VI, Zone VII, Zone VIII, Zone IX"
    },
    {
        "code": "CMD-TOM-01", "name": "Tomato", "category": "VEGETABLES",
        "farm_loss": 8.37, "market_loss": 3.25, "total_loss": 11.62,
        "production_kmt": 20694, "opt_temp": "10.0 - 13.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 5, "cold_shelf_days": 21, "decay_exp": 1.75,
        "price_usd": 0.50, "cost_usd": 0.28, "waste_disp_usd": 0.10,
        "loss_drivers": "HIGHEST VEGETABLE LOSS (11.62%): soft skin rupture, crushing in deep crates, transit shock on unpaved roads, market gluts",
        "zones": "Zone IV, Zone V, Zone VII, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-TAP-01", "name": "Tapioca (Cassava)", "category": "VEGETABLES",
        "farm_loss": 3.39, "market_loss": 1.48, "total_loss": 4.87,
        "production_kmt": 6213, "opt_temp": "3.0 - 5.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 4, "cold_shelf_days": 30, "decay_exp": 1.65,
        "price_usd": 0.32, "cost_usd": 0.18, "waste_disp_usd": 0.05,
        "loss_drivers": "Lowest vegetable loss percentage, but rapid post-harvest physiological deterioration (PPD) within 48h of harvest",
        "zones": "Zone X, Zone XI, Zone XII, Zone XV"
    },
    {
        "code": "CMD-BGD-01", "name": "Bottle Gourd (Lauki)", "category": "VEGETABLES",
        "farm_loss": 4.69, "market_loss": 2.32, "total_loss": 7.01,
        "production_kmt": 3210, "opt_temp": "10.0 - 12.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 6, "cold_shelf_days": 20, "decay_exp": 1.40,
        "price_usd": 0.35, "cost_usd": 0.20, "waste_disp_usd": 0.06,
        "loss_drivers": "Surface bruising, neck rot, drying out and yellowing at retail displays",
        "zones": "Zone IV, Zone V, Zone VI, Zone VII, Zone VIII, Zone IX"
    },
    {
        "code": "CMD-BRN-01", "name": "Brinjal (Eggplant / Aubergine)", "category": "VEGETABLES",
        "farm_loss": 4.75, "market_loss": 2.66, "total_loss": 7.41,
        "production_kmt": 12765, "opt_temp": "10.0 - 12.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 4, "cold_shelf_days": 16, "decay_exp": 1.55,
        "price_usd": 0.38, "cost_usd": 0.22, "waste_disp_usd": 0.07,
        "loss_drivers": "Chilling injury if stored <8 C, calyx browning, skin wrinkling, transit compression",
        "zones": "Zone III, Zone IV, Zone VII, Zone VIII, Zone IX, Zone X, Zone XI"
    },
    {
        "code": "CMD-BNS-01", "name": "Beans (French / Cluster)", "category": "VEGETABLES",
        "farm_loss": 3.68, "market_loss": 3.43, "total_loss": 7.11,
        "production_kmt": 2726, "opt_temp": "5.0 - 7.0", "opt_humidity": "95 - 98%",
        "ambient_shelf_days": 4, "cold_shelf_days": 18, "decay_exp": 1.50,
        "price_usd": 0.70, "cost_usd": 0.42, "waste_disp_usd": 0.09,
        "loss_drivers": "High market loss (3.43%): snap breakage in gunny bags, wilting, fiber toughening",
        "zones": "Zone I, Zone VII, Zone VIII, Zone IX, Zone X, Zone XII"
    },
    {
        "code": "CMD-RAD-01", "name": "Radish", "category": "VEGETABLES",
        "farm_loss": 3.96, "market_loss": 2.50, "total_loss": 6.46,
        "production_kmt": 3214, "opt_temp": "0.0 - 1.0", "opt_humidity": "95 - 98%",
        "ambient_shelf_days": 4, "cold_shelf_days": 28, "decay_exp": 1.48,
        "price_usd": 0.25, "cost_usd": 0.14, "waste_disp_usd": 0.05,
        "loss_drivers": "Foliage yellowing, pithiness, rapid transpiration leading to flaccid roots",
        "zones": "Zone I, Zone III, Zone IV, Zone V, Zone VI, Zone VIII"
    },
    {
        "code": "CMD-CAP-01", "name": "Capsicum (Bell Pepper)", "category": "VEGETABLES",
        "farm_loss": 2.60, "market_loss": 2.55, "total_loss": 5.15,
        "production_kmt": 586, "opt_temp": "7.0 - 10.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 6, "cold_shelf_days": 25, "decay_exp": 1.42,
        "price_usd": 1.10, "cost_usd": 0.68, "waste_disp_usd": 0.12,
        "loss_drivers": "Caliphal cracking, botrytis fruit rot, transit scuffing, chilling injury <7 C",
        "zones": "Zone I, Zone VI, Zone VIII, Zone IX, Zone X"
    },
    {
        "code": "CMD-OKR-01", "name": "Okra (Bhindi / Ladyfinger)", "category": "VEGETABLES",
        "farm_loss": 3.76, "market_loss": 2.25, "total_loss": 6.01,
        "production_kmt": 6873, "opt_temp": "8.0 - 10.0", "opt_humidity": "90 - 95%",
        "ambient_shelf_days": 3, "cold_shelf_days": 12, "decay_exp": 1.68,
        "price_usd": 0.60, "cost_usd": 0.35, "waste_disp_usd": 0.08,
        "loss_drivers": "Pod tip snapping, blackening under poor air circulation, chilling injury if held <7 C",
        "zones": "Zone III, Zone IV, Zone VII, Zone VIII, Zone IX, Zone X, Zone XIII"
    },

    # Plantation Crops and Spices (8)
    {
        "code": "CMD-ARC-01", "name": "Areca Nut (Betel Nut)", "category": "PLANTATION_SPICES",
        "farm_loss": 3.58, "market_loss": 0.83, "total_loss": 4.41,
        "production_kmt": 1666, "opt_temp": "18.0 - 25.0", "opt_humidity": "60 - 70%",
        "ambient_shelf_days": 180, "cold_shelf_days": 365, "decay_exp": 1.08,
        "price_usd": 4.50, "cost_usd": 3.20, "waste_disp_usd": 0.15,
        "loss_drivers": "De-husking physical injury, fungal discoloration during wet monsoon drying",
        "zones": "Zone II, Zone X, Zone XI, Zone XII, Zone XV"
    },
    {
        "code": "CMD-CSH-01", "name": "Cashew Nut (Raw Seed)", "category": "PLANTATION_SPICES",
        "farm_loss": 3.11, "market_loss": 0.61, "total_loss": 3.72,
        "production_kmt": 752, "opt_temp": "15.0 - 22.0", "opt_humidity": "55 - 65%",
        "ambient_shelf_days": 240, "cold_shelf_days": 450, "decay_exp": 1.06,
        "price_usd": 5.80, "cost_usd": 4.10, "waste_disp_usd": 0.18,
        "loss_drivers": "Uncollected fallen nuts, improper drying causing kernel mold, shell oil staining",
        "zones": "Zone VII, Zone X, Zone XI, Zone XII, Zone XIII"
    },
    {
        "code": "CMD-CCN-01", "name": "Coconut (Mature Nut)", "category": "PLANTATION_SPICES",
        "farm_loss": 2.85, "market_loss": 1.00, "total_loss": 3.85,
        "production_kmt": 13317, "opt_temp": "12.0 - 16.0", "opt_humidity": "70 - 75%",
        "ambient_shelf_days": 60, "cold_shelf_days": 150, "decay_exp": 1.12,
        "price_usd": 0.40, "cost_usd": 0.25, "waste_disp_usd": 0.05,
        "loss_drivers": "Nut cracking upon tree drop, copra mold in damp transit, water drying",
        "zones": "Zone X, Zone XI, Zone XII, Zone XV"
    },
    {
        "code": "CMD-SGC-01", "name": "Sugarcane", "category": "PLANTATION_SPICES",
        "farm_loss": 5.63, "market_loss": 1.71, "total_loss": 7.34,
        "production_kmt": 439425, "opt_temp": "18.0 - 25.0", "opt_humidity": "70 - 80%",
        "ambient_shelf_days": 3, "cold_shelf_days": 10, "decay_exp": 1.70,
        "price_usd": 0.04, "cost_usd": 0.025, "waste_disp_usd": 0.005,
        "loss_drivers": "Sucrose inversion to glucose/fructose within 48h of cut, driage loss in queue at sugar mills",
        "zones": "Zone IV, Zone V, Zone VI, Zone VII, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-BKP-01", "name": "Black Pepper", "category": "PLANTATION_SPICES",
        "farm_loss": 1.11, "market_loss": 0.19, "total_loss": 1.30,
        "production_kmt": 95, "opt_temp": "15.0 - 20.0", "opt_humidity": "50 - 60%",
        "ambient_shelf_days": 365, "cold_shelf_days": 720, "decay_exp": 1.02,
        "price_usd": 6.50, "cost_usd": 4.80, "waste_disp_usd": 0.20,
        "loss_drivers": "Lowest overall agricultural loss (1.30%): mold during yard drying, bag spillage",
        "zones": "Zone II, Zone XII"
    },
    {
        "code": "CMD-CHL-01", "name": "Chilli (Dry Red)", "category": "PLANTATION_SPICES",
        "farm_loss": 5.20, "market_loss": 0.91, "total_loss": 6.11,
        "production_kmt": 1836, "opt_temp": "8.0 - 12.0", "opt_humidity": "60 - 65%",
        "ambient_shelf_days": 180, "cold_shelf_days": 365, "decay_exp": 1.15,
        "price_usd": 2.80, "cost_usd": 1.95, "waste_disp_usd": 0.12,
        "loss_drivers": "Color fading under ambient sun, fungal aflatoxin buildup during drying, pod breakage in transit",
        "zones": "Zone VIII, Zone IX, Zone X, Zone XI, Zone XIII"
    },
    {
        "code": "CMD-COR-01", "name": "Coriander Seed", "category": "PLANTATION_SPICES",
        "farm_loss": 4.72, "market_loss": 0.60, "total_loss": 5.32,
        "production_kmt": 735, "opt_temp": "12.0 - 18.0", "opt_humidity": "55 - 65%",
        "ambient_shelf_days": 240, "cold_shelf_days": 420, "decay_exp": 1.10,
        "price_usd": 1.60, "cost_usd": 1.10, "waste_disp_usd": 0.08,
        "loss_drivers": "Splitting of mericarps during threshing, volatile essential oil loss under heat",
        "zones": "Zone VIII, Zone XIII, Zone XIV"
    },
    {
        "code": "CMD-TRM-01", "name": "Turmeric (Cured Rhizome)", "category": "PLANTATION_SPICES",
        "farm_loss": 3.78, "market_loss": 1.57, "total_loss": 5.35,
        "production_kmt": 1222, "opt_temp": "12.0 - 16.0", "opt_humidity": "60 - 65%",
        "ambient_shelf_days": 240, "cold_shelf_days": 450, "decay_exp": 1.10,
        "price_usd": 1.85, "cost_usd": 1.25, "waste_disp_usd": 0.10,
        "loss_drivers": "Damage during boiling/curing, curcumin degradation under sunlight, insect bore during storage",
        "zones": "Zone VII, Zone VIII, Zone X, Zone XI, Zone XII"
    },

    # Dairy, Meat, Poultry, Fisheries, Eggs (6)
    {
        "code": "CMD-MLK-01", "name": "Milk (Bovine)", "category": "DAIRY",
        "farm_loss": 0.54, "market_loss": 0.33, "total_loss": 0.87,
        "production_kmt": 230580, "opt_temp": "2.0 - 4.0", "opt_humidity": "N/A",
        "ambient_shelf_days": 1, "cold_shelf_days": 5, "decay_exp": 1.95,
        "price_usd": 0.62, "cost_usd": 0.44, "waste_disp_usd": 0.05,
        "loss_drivers": "Lowest loss in livestock due to organized AMUL/NDDB dairy cold chains; souring during chilling delay",
        "zones": "Zone IV, Zone V, Zone VI, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-FSH-INL-01", "name": "Inland Fisheries (Freshwater Fish)", "category": "FISHERIES",
        "farm_loss": 3.80, "market_loss": 1.06, "total_loss": 4.86,
        "production_kmt": 13110, "opt_temp": "0.0 - 2.0", "opt_humidity": "95 - 100%",
        "ambient_shelf_days": 1, "cold_shelf_days": 10, "decay_exp": 1.85,
        "price_usd": 2.50, "cost_usd": 1.70, "waste_disp_usd": 0.25,
        "loss_drivers": "Delayed icing at farm pond, lack of insulated transport boxes, autolytic flesh spoilage",
        "zones": "Zone II, Zone III, Zone IV, Zone VII, Zone X, Zone XI"
    },
    {
        "code": "CMD-FSH-MAR-01", "name": "Marine Fisheries (Sea Catch)", "category": "FISHERIES",
        "farm_loss": 7.00, "market_loss": 1.76, "total_loss": 8.76,
        "production_kmt": 4430, "opt_temp": "-1.0 - 1.0", "opt_humidity": "95 - 100%",
        "ambient_shelf_days": 1, "cold_shelf_days": 12, "decay_exp": 1.90,
        "price_usd": 3.80, "cost_usd": 2.40, "waste_disp_usd": 0.30,
        "loss_drivers": "Highest fisheries loss (8.76%): onboard ice shortage on multi-day trawlers, landing center congestion",
        "zones": "Zone XI, Zone XII, Zone XIII, Zone XV"
    },
    {
        "code": "CMD-MET-01", "name": "Meat (Mutton / Chevon / Poultry / Buffalo)", "category": "MEAT",
        "farm_loss": 1.43, "market_loss": 0.91, "total_loss": 2.34,
        "production_kmt": 9770, "opt_temp": "0.0 - 2.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 1, "cold_shelf_days": 8, "decay_exp": 1.80,
        "price_usd": 5.20, "cost_usd": 3.60, "waste_disp_usd": 0.40,
        "loss_drivers": "Lack of refrigerated slaughterhouses, surface microbial contamination, transit temperature spikes",
        "zones": "Zone IV, Zone V, Zone VI, Zone VIII, Zone IX, Zone X, Zone XIII"
    },
    {
        "code": "CMD-PLT-01", "name": "Poultry Meat (Broiler Chicken)", "category": "POULTRY",
        "farm_loss": 2.51, "market_loss": 3.12, "total_loss": 5.63,
        "production_kmt": 4780, "opt_temp": "-1.0 - 2.0", "opt_humidity": "85 - 90%",
        "ambient_shelf_days": 1, "cold_shelf_days": 7, "decay_exp": 1.88,
        "price_usd": 2.20, "cost_usd": 1.50, "waste_disp_usd": 0.20,
        "loss_drivers": "Mortality during live crate transport, evisceration contamination, market-level drip loss",
        "zones": "Zone VI, Zone VII, Zone IX, Zone X, Zone XI, Zone XII, Zone XIII"
    },
    {
        "code": "CMD-EGG-01", "name": "Egg (Layer Poultry)", "category": "EGGS",
        "farm_loss": 4.40, "market_loss": 1.63, "total_loss": 6.03,
        "production_kmt": 7363, "opt_temp": "10.0 - 15.0", "opt_humidity": "75 - 80%",
        "ambient_shelf_days": 14, "cold_shelf_days": 60, "decay_exp": 1.35,
        "price_usd": 1.40, "cost_usd": 0.95, "waste_disp_usd": 0.10,
        "loss_drivers": "Shell cracks in poor fiber trays, road vibration, internal albumen liquefaction in summer",
        "zones": "Zone VI, Zone IX, Zone X, Zone XI, Zone XIII"
    }
]

# --------------------------------------------------------------------------
# 2. 15 AGRO-CLIMATIC ZONES OF INDIA MASTER DATASET
# --------------------------------------------------------------------------
# Source: Planning Commission of India & ICAR
AGRO_ZONES_15 = [
    {
        "zone_code": "ZONE-01", "zone_number": "Zone I",
        "zone_name": "Western Himalayan Region",
        "states_covered": "Jammu & Kashmir, Ladakh, Himachal Pradesh, Uttarakhand",
        "climate_type": "Temperate to Sub-Tropical Montane & Alpine",
        "rainfall_mm": "1000 - 2000 mm",
        "soil_types": "Brown Hill Soils, Mountain Meadow Soils, Podzolic",
        "key_mofpi_commodities": "Apple, Mushroom, Walnut, Pear, Peach, Saffron, Beans",
        "vulnerability_index": "HIGH",
        "cold_chain_gap": "Severe transit bottlenecks on hill roads; critical need for CA stores and reefer collection at farm-gates",
        "logistics_hub": "Shimla Cold Terminal / Srinagar Cargo Hub"
    },
    {
        "zone_code": "ZONE-02", "zone_number": "Zone II",
        "zone_name": "Eastern Himalayan Region",
        "states_covered": "Assam, Sikkim, Arunachal Pradesh, Meghalaya, Nagaland, Manipur, Mizoram, Tripura, North Bengal",
        "climate_type": "Humid to Per-Humid Sub-Tropical",
        "rainfall_mm": "2000 - 4000 mm",
        "soil_types": "Red Loamy, Alluvial, Laterite Soils",
        "key_mofpi_commodities": "Pineapple, Banana, Ginger, Turmeric, Black Pepper, Inland Fish, Paddy",
        "vulnerability_index": "HIGH",
        "cold_chain_gap": "High humidity accelerates mold; limited refrigerated transit through Siliguri corridor",
        "logistics_hub": "Guwahati Cold Chain Hub"
    },
    {
        "zone_code": "ZONE-03", "zone_number": "Zone III",
        "zone_name": "Lower Gangetic Plain Region",
        "states_covered": "West Bengal (Plain districts)",
        "climate_type": "Moist Tropical to Sub-Tropical Humid",
        "rainfall_mm": "1400 - 1800 mm",
        "soil_types": "Deltaic Alluvium, Red & Brown Soils",
        "key_mofpi_commodities": "Paddy, Potato, Inland Fish, Cabbage, Cauliflower, Mango, Jute",
        "vulnerability_index": "MEDIUM",
        "cold_chain_gap": "Seasonal potato cold storage gluts; high fish spoilage due to insufficient clean ice at landing ghats",
        "logistics_hub": "Kolkata Integrated Produce Terminal"
    },
    {
        "zone_code": "ZONE-04", "zone_number": "Zone IV",
        "zone_name": "Middle Gangetic Plain Region",
        "states_covered": "Eastern Uttar Pradesh, Bihar",
        "climate_type": "Sub-Humid Continental Monsoonal",
        "rainfall_mm": "1000 - 1400 mm",
        "soil_types": "Old Alluvium (Bangar), New Alluvium (Khadar)",
        "key_mofpi_commodities": "Paddy, Wheat, Tomato, Guava, Litchi, Mango, Potato, Maize, Sugarcane",
        "vulnerability_index": "CRITICAL",
        "cold_chain_gap": "Extreme summer temperatures (>44 C) trigger rapid tomato and guava decay; poor rural farm cold stores",
        "logistics_hub": "Varanasi Perishable Cargo Terminal / Patna Agro Hub"
    },
    {
        "zone_code": "ZONE-05", "zone_number": "Zone V",
        "zone_name": "Upper Gangetic Plain Region",
        "states_covered": "Central & Western Uttar Pradesh",
        "climate_type": "Semi-Arid to Sub-Humid Sub-Tropical",
        "rainfall_mm": "700 - 1000 mm",
        "soil_types": "Alluvial, Loamy Soils",
        "key_mofpi_commodities": "Wheat, Sugarcane, Potato, Mustard, Mango, Milk, Poultry",
        "vulnerability_index": "MEDIUM",
        "cold_chain_gap": "Sugarcane sucrose inversion during mill transport queues; dairy chilling delays in rural hinterlands",
        "logistics_hub": "Noida / Agra Food Logistics Corridor"
    },
    {
        "zone_code": "ZONE-06", "zone_number": "Zone VI",
        "zone_name": "Trans-Gangetic Plain Region",
        "states_covered": "Punjab, Haryana, Delhi, Chandigarh, Sri Ganganagar (Rajasthan)",
        "climate_type": "Semi-Arid Continental",
        "rainfall_mm": "400 - 750 mm",
        "soil_types": "Calcareous Alluvial, Desert Soils, Loam",
        "key_mofpi_commodities": "Wheat, Paddy, Citrus (Kinnow), Mushroom, Milk, Poultry, Egg, Cauliflower",
        "vulnerability_index": "MEDIUM",
        "cold_chain_gap": "High mechanization reduces farm loss, but peak summer glut of Kinnow and milk requires reefer routing",
        "logistics_hub": "Delhi NCR Kundli Cold Logistics Center / Ludhiana Terminal"
    },
    {
        "zone_code": "ZONE-07", "zone_number": "Zone VII",
        "zone_name": "Eastern Plateau and Hills Region",
        "states_covered": "Jharkhand, Chhattisgarh, Odisha (Inland), MP (East), Maharashtra (Vidarbha border)",
        "climate_type": "Tropical Moist Sub-Humid to Dry Sub-Humid",
        "rainfall_mm": "1200 - 1600 mm",
        "soil_types": "Red & Yellow Soils, Mixed Red & Black Soils",
        "key_mofpi_commodities": "Paddy, Tomato, Okra, Turmeric, Pigeon Pea, Maize, Inland Fish",
        "vulnerability_index": "HIGH",
        "cold_chain_gap": "Tribal farming zones lack pre-cooling units; high distress sales of tomato and leafy vegetables",
        "logistics_hub": "Raipur Agro Terminal / Ranchi Cold Depot"
    },
    {
        "zone_code": "ZONE-08", "zone_number": "Zone VIII",
        "zone_name": "Central Plateau and Hills Region",
        "states_covered": "Madhya Pradesh, Rajasthan (East), UP (Bundelkhand)",
        "climate_type": "Sub-Humid Dry Tropical to Semi-Arid",
        "rainfall_mm": "800 - 1200 mm",
        "soil_types": "Medium & Deep Black Soils, Alluvial Loams",
        "key_mofpi_commodities": "Soybean, Chickpea, Wheat, Mustard, Garlic, Coriander, Guava, Milk",
        "vulnerability_index": "MEDIUM",
        "cold_chain_gap": "Soybean threshing and storage mold; high chickpea bruchid vulnerability in unconditioned godowns",
        "logistics_hub": "Indore Cold Hub / Bhopal Distribution Depot"
    },
    {
        "zone_code": "ZONE-09", "zone_number": "Zone IX",
        "zone_name": "Western Plateau and Hills Region",
        "states_covered": "Maharashtra (Western & Central), MP (Malwa)",
        "climate_type": "Semi-Arid Tropical",
        "rainfall_mm": "600 - 1000 mm",
        "soil_types": "Black Cotton Soil (Regur), Shallow Skeletal Soils",
        "key_mofpi_commodities": "Grapes, Onion, Pomegranate, Banana, Citrus, Sugarcane, Cottonseed, Soybean",
        "vulnerability_index": "CRITICAL",
        "cold_chain_gap": "High concentration of commercial horticulture; onion chawl rotting and grape shelf-life decay without rapid cold chain",
        "logistics_hub": "Nashik Agri-Logistics Terminal / Pune Reefer Park"
    },
    {
        "zone_code": "ZONE-10", "zone_number": "Zone X",
        "zone_name": "Southern Plateau and Hills Region",
        "states_covered": "Telangana, Andhra Pradesh (Rayalaseema), Karnataka (Interior), Tamil Nadu (Interior)",
        "climate_type": "Semi-Arid Dry Tropical",
        "rainfall_mm": "500 - 900 mm",
        "soil_types": "Red Sandy, Red Loam, Deep Black Soils",
        "key_mofpi_commodities": "Pigeon Pea, Groundnut, Mango, Tomato, Chilli, Poultry, Egg, Milk, Tapioca",
        "vulnerability_index": "HIGH",
        "cold_chain_gap": "Intense dry heat causes desiccation; massive egg breakage and tomato spoilage during inter-district transit",
        "logistics_hub": "Bengaluru Cold Terminal / Hyderabad Agro Cargo Center"
    },
    {
        "zone_code": "ZONE-11", "zone_number": "Zone XI",
        "zone_name": "East Coast Plains and Hills Region",
        "states_covered": "Coastal Odisha, Coastal Andhra Pradesh, Coastal Tamil Nadu, Puducherry",
        "climate_type": "Humid Coastal Tropical",
        "rainfall_mm": "1000 - 1300 mm",
        "soil_types": "Coastal Alluvium, Saline & Alkali Soils, Red Soils",
        "key_mofpi_commodities": "Paddy, Marine Fisheries, Inland Fisheries, Coconut, Banana, Cashew, Chilli",
        "vulnerability_index": "HIGH",
        "cold_chain_gap": "Frequent cyclone hazards, high coastal ambient humidity accelerates fish and banana rot",
        "logistics_hub": "Visakhapatnam Marine Port Hub / Chennai Agro Depot"
    },
    {
        "zone_code": "ZONE-12", "zone_number": "Zone XII",
        "zone_name": "West Coast Plains and Ghat Region",
        "states_covered": "Coastal Maharashtra, Goa, Coastal Karnataka, Kerala",
        "climate_type": "Humid Tropical Monsoonal",
        "rainfall_mm": "2500 - 3500 mm",
        "soil_types": "Laterite, Coastal Sands, Alluvial",
        "key_mofpi_commodities": "Marine Fisheries, Black Pepper, Areca Nut, Coconut, Cashew, Banana, Tapioca",
        "vulnerability_index": "MEDIUM",
        "cold_chain_gap": "Heavy monsoon rains impede solar drying of spices; landing wharf cold-storage deficits for marine catches",
        "logistics_hub": "Kochi Seafood Terminal / Mangaluru Cold Facility"
    },
    {
        "zone_code": "ZONE-13", "zone_number": "Zone XIII",
        "zone_name": "Gujarat Plains and Hills Region",
        "states_covered": "Gujarat, Dadra & Nagar Haveli, Daman & Diu",
        "climate_type": "Arid to Semi-Arid Tropical",
        "rainfall_mm": "500 - 1000 mm",
        "soil_types": "Medium Black, Alluvial, Saline Soils",
        "key_mofpi_commodities": "Groundnut, Cottonseed, Cumin, Mustard, Potato, Banana, Marine Fisheries, Milk",
        "vulnerability_index": "MEDIUM",
        "cold_chain_gap": "Established dairy and marine logistics, but severe summer heat waves require reefer integrity for perishables",
        "logistics_hub": "Ahmedabad Cold Chain Hub / Surat Perishable Terminal"
    },
    {
        "zone_code": "ZONE-14", "zone_number": "Zone XIV",
        "zone_name": "Western Dry Region",
        "states_covered": "Western Rajasthan (Thar Desert - Jodhpur, Bikaner, Jaisalmer, Barmer)",
        "climate_type": "Hyper-Arid Desert",
        "rainfall_mm": "100 - 400 mm",
        "soil_types": "Desert Soils, Sandy Soils, Lithosols",
        "key_mofpi_commodities": "Bajra, Moth Bean, Cumin, Coriander, Mustard, Guar, Milk",
        "vulnerability_index": "CRITICAL",
        "cold_chain_gap": "Extreme thermal swings (0 C winter to 50 C summer), long haul distances to consumption centers",
        "logistics_hub": "Jodhpur Agro Depot / Bikaner Terminal"
    },
    {
        "zone_code": "ZONE-15", "zone_number": "Zone XV",
        "zone_name": "The Island Region",
        "states_covered": "Andaman & Nicobar Islands, Lakshadweep",
        "climate_type": "Equatorial Humid Marine",
        "rainfall_mm": "3000 mm+",
        "soil_types": "Coastal Sands, Peaty Soils",
        "key_mofpi_commodities": "Coconut, Areca Nut, Marine Fisheries, Pineapple, Banana",
        "vulnerability_index": "CRITICAL",
        "cold_chain_gap": "Extreme geographic isolation; inter-island reefer vessels lacking; 100% reliant on sea/air cold-chain links",
        "logistics_hub": "Port Blair Cold Cargo Dock"
    }
]

# --------------------------------------------------------------------------
# 3. FRESHROUTE OPERATIONAL WAREHOUSES ACROSS 15 AGRO-ZONES
# --------------------------------------------------------------------------
INDIAN_WAREHOUSES = [
    {"code": "DC-AZ01-SHI", "name": "Shimla Western Himalayan Cold Hub", "address": "NH-5 Highway Terminal", "city": "Shimla", "state": "HP", "postalCode": "171001", "latitude": 31.1048, "longitude": 77.1734, "totalCapacityKg": 300000.0, "totalVolumeM3": 2200.0, "coldStorageType": "CONTROLLED_ATMOSPHERE_CHAMBERS"},
    {"code": "DC-AZ02-GUW", "name": "Guwahati Eastern Himalayan Transit Depot", "address": "Lokhra Industrial Corridor", "city": "Guwahati", "state": "AS", "postalCode": "781034", "latitude": 26.1158, "longitude": 91.7086, "totalCapacityKg": 250000.0, "totalVolumeM3": 1800.0, "coldStorageType": "MULTI_COMMODITY_COLD_ROOMS"},
    {"code": "DC-AZ03-KOL", "name": "Kolkata Lower Gangetic Distribution Terminal", "address": "Dankuni Logistics Park", "city": "Kolkata", "state": "WB", "postalCode": "712311", "latitude": 22.6853, "longitude": 88.2938, "totalCapacityKg": 450000.0, "totalVolumeM3": 3200.0, "coldStorageType": "DUAL_TEMP_FISH_PRODUCE"},
    {"code": "DC-AZ04-VAR", "name": "Varanasi Middle Gangetic Agro Gateway", "address": "NH-19 Cargo Terminal", "city": "Varanasi", "state": "UP", "postalCode": "221002", "latitude": 25.3176, "longitude": 82.9739, "totalCapacityKg": 380000.0, "totalVolumeM3": 2600.0, "coldStorageType": "INTEGRATED_PACKHOUSE_COLDSTORE"},
    {"code": "DC-AZ05-NOI", "name": "Noida Upper Gangetic Reefer Center", "address": "Ecotech Industrial Area", "city": "Greater Noida", "state": "UP", "postalCode": "201306", "latitude": 28.4744, "longitude": 77.5040, "totalCapacityKg": 500000.0, "totalVolumeM3": 3500.0, "coldStorageType": "HIGH_THROUGHPUT_AUTOMATED_REEFER"},
    {"code": "DC-AZ06-DEL", "name": "Delhi NCR Kundli Trans-Gangetic Food Depot", "address": "Kundli Mega Food Park Zone", "city": "Sonipat", "state": "HR", "postalCode": "131028", "latitude": 28.8724, "longitude": 77.1264, "totalCapacityKg": 600000.0, "totalVolumeM3": 4200.0, "coldStorageType": "MULTI_ZONE_FROZEN_CHILLED"},
    {"code": "DC-AZ07-RAI", "name": "Raipur Eastern Plateau Perishable Depot", "address": "Bhatagaon Logistics Complex", "city": "Raipur", "state": "CG", "postalCode": "492013", "latitude": 21.2514, "longitude": 81.6296, "totalCapacityKg": 280000.0, "totalVolumeM3": 1900.0, "coldStorageType": "SOLAR_ASSISTED_COLD_STORAGE"},
    {"code": "DC-AZ08-IND", "name": "Indore Central Plateau Agro Hub", "address": "Pithampur Special Economic Zone", "city": "Indore", "state": "MP", "postalCode": "454775", "latitude": 22.6146, "longitude": 75.6811, "totalCapacityKg": 420000.0, "totalVolumeM3": 3000.0, "coldStorageType": "GRAIN_PULSE_COLD_CHAMBERS"},
    {"code": "DC-AZ09-NAS", "name": "Nashik Western Plateau Horticulture Terminal", "address": "Pimpalgaon Grape Park", "city": "Nashik", "state": "MH", "postalCode": "422209", "latitude": 20.1706, "longitude": 73.9877, "totalCapacityKg": 550000.0, "totalVolumeM3": 3800.0, "coldStorageType": "RAPID_PRECOOLING_CA_HUB"},
    {"code": "DC-AZ10-BLR", "name": "Bengaluru Southern Plateau Cold Network", "address": "Dabaspete Logistics Node", "city": "Bengaluru", "state": "KA", "postalCode": "562111", "latitude": 13.2324, "longitude": 77.2435, "totalCapacityKg": 520000.0, "totalVolumeM3": 3600.0, "coldStorageType": "MULTI_TEMP_AUTOMATED_REEFER"},
    {"code": "DC-AZ11-VIZ", "name": "Visakhapatnam East Coast Marine Terminal", "address": "Gajuwaka Port Access Road", "city": "Visakhapatnam", "state": "AP", "postalCode": "530026", "latitude": 17.6905, "longitude": 83.2100, "totalCapacityKg": 350000.0, "totalVolumeM3": 2400.0, "coldStorageType": "DEEP_FREEZE_MARINE_FACILITY"},
    {"code": "DC-AZ12-KOC", "name": "Kochi West Coast Seafood & Spice Hub", "address": "Willingdon Island Terminal", "city": "Kochi", "state": "KL", "postalCode": "682003", "latitude": 9.9610, "longitude": 76.2750, "totalCapacityKg": 320000.0, "totalVolumeM3": 2200.0, "coldStorageType": "CRYOGENIC_SEAFOOD_STORAGE"},
    {"code": "DC-AZ13-AHM", "name": "Ahmedabad Gujarat Plains Logistics Center", "address": "Changodar Agro Industrial Area", "city": "Ahmedabad", "state": "GJ", "postalCode": "382213", "latitude": 22.9238, "longitude": 72.4398, "totalCapacityKg": 480000.0, "totalVolumeM3": 3400.0, "coldStorageType": "DAIRY_PRODUCE_DUAL_ZONE"},
    {"code": "DC-AZ14-JOD", "name": "Jodhpur Western Dry Cold Depot", "address": "Boronada Industrial Park", "city": "Jodhpur", "state": "RJ", "postalCode": "342012", "latitude": 26.2089, "longitude": 72.9511, "totalCapacityKg": 220000.0, "totalVolumeM3": 1600.0, "coldStorageType": "THERMALLY_INSULATED_DRY_CHILL"},
    {"code": "DC-AZ15-PBL", "name": "Port Blair Island Cold Storage Dock", "address": "Haddo Wharf Cargo Area", "city": "Port Blair", "state": "AN", "postalCode": "744102", "latitude": 11.6784, "longitude": 92.7275, "totalCapacityKg": 120000.0, "totalVolumeM3": 900.0, "coldStorageType": "PORTABLE_REEFER_CONTAINER_TERMINAL"}
]

# --------------------------------------------------------------------------
# 4. WRITE 54 COMMODITIES POST-HARVEST LOSS CSV
# --------------------------------------------------------------------------
def generate_54_commodities_csv():
    filepath = os.path.join(DATA_DIR, "mofpi_54_commodities_post_harvest_losses.csv")
    fields = [
        "commodity_code", "commodity_name", "category", "farm_level_loss_percent",
        "market_level_loss_percent", "total_post_harvest_loss_percent",
        "national_production_000_mt", "estimated_annual_loss_mt",
        "optimum_temp_celsius", "optimum_humidity_percent",
        "ambient_shelf_life_days", "cold_chain_shelf_life_days",
        "decay_rate_exponent", "primary_loss_drivers", "key_agro_climatic_zones"
    ]
    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for c in COMMODITIES_54:
            ann_loss = round((c["production_kmt"] * 1000) * (c["total_loss"] / 100.0), 2)
            writer.writerow([
                c["code"], c["name"], c["category"],
                f"{c['farm_loss']:.2f}", f"{c['market_loss']:.2f}", f"{c['total_loss']:.2f}",
                c["production_kmt"], ann_loss,
                c["opt_temp"], c["opt_humidity"],
                c["ambient_shelf_days"], c["cold_shelf_days"],
                f"{c['decay_exp']:.2f}", c["loss_drivers"], c["zones"]
            ])
    print(f"  Generated: {filepath} ({len(COMMODITIES_54)} rows)")

# --------------------------------------------------------------------------
# 5. WRITE 15 AGRO-CLIMATIC ZONES CSV
# --------------------------------------------------------------------------
def generate_15_zones_csv():
    filepath = os.path.join(DATA_DIR, "mofpi_15_agro_climatic_zones_india.csv")
    fields = [
        "zone_code", "zone_number", "zone_name", "states_covered",
        "climate_type", "rainfall_mm", "soil_types",
        "key_mofpi_commodities", "post_harvest_vulnerability_index",
        "cold_chain_infrastructure_gap", "logistics_hub"
    ]
    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for z in AGRO_ZONES_15:
            writer.writerow([
                z["zone_code"], z["zone_number"], z["zone_name"], z["states_covered"],
                z["climate_type"], z["rainfall_mm"], z["soil_types"],
                z["key_mofpi_commodities"], z["vulnerability_index"],
                z["cold_chain_gap"], z["logistics_hub"]
            ])
    print(f"  Generated: {filepath} ({len(AGRO_ZONES_15)} rows)")

# --------------------------------------------------------------------------
# 6. WRITE ZONE-COMMODITY INTERACTION MATRIX CSV
# --------------------------------------------------------------------------
def generate_zone_commodity_matrix_csv():
    filepath = os.path.join(DATA_DIR, "freshroute_mofpi_zone_commodity_matrix.csv")
    fields = [
        "matrix_id", "zone_code", "zone_name", "commodity_code", "commodity_name",
        "category", "peak_harvest_months", "baseline_farm_loss_percent",
        "baseline_market_loss_percent", "baseline_total_loss_percent",
        "freshroute_projected_loss_reduction_percent", "freshroute_projected_salvage_percent",
        "recommended_pre_cooling_hours", "optimal_transit_temp_celsius"
    ]
    matrix_rows = []
    matrix_id = 1
    # Create pairings for major crops produced in each zone
    for z in AGRO_ZONES_15:
        zone_crops = [item.strip() for item in z["key_mofpi_commodities"].split(",")]
        for c in COMMODITIES_54:
            # Check if crop name matches any in zone
            c_base = c["name"].split(" ")[0].lower()
            matched = any(c_base in zc.lower() for zc in zone_crops)
            if matched or (z["zone_code"] in c["zones"]):
                # Calculate FreshRoute optimization gains
                proj_red = round(c["total_loss"] * 0.38, 2) # FreshRoute FEFO avoids ~38% of spoilage
                salvage = round(c["total_loss"] * 0.45, 2)  # Dynamic markdowns recoup ~45% of value
                precool_hrs = 2.0 if c["category"] in ["FRUITS", "VEGETABLES", "FISHERIES"] else 0.5
                temp_matches = re.findall(r"[-+]?\d*\.?\d+", c["opt_temp"])
                temp_val = float(temp_matches[0]) if temp_matches else 4.0
                matrix_rows.append([
                    f"MAT-{matrix_id:04d}", z["zone_code"], z["zone_name"], c["code"], c["name"],
                    c["category"], "Oct - Mar" if c["category"] in ["CEREALS", "PULSES"] else "Mar - Jul",
                    f"{c['farm_loss']:.2f}", f"{c['market_loss']:.2f}", f"{c['total_loss']:.2f}",
                    f"{proj_red:.2f}", f"{salvage:.2f}", precool_hrs, temp_val
                ])
                matrix_id += 1

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        writer.writerows(matrix_rows)
    print(f"  Generated: {filepath} ({len(matrix_rows)} matrix rows)")

# --------------------------------------------------------------------------
# 7. WRITE FRESHROUTE INDIA COMMODITY CATALOG CSV
# --------------------------------------------------------------------------
def generate_freshroute_commodity_catalog_csv():
    filepath = os.path.join(DATA_DIR, "freshroute_india_commodities_catalog.csv")
    fields = [
        "code", "name", "category", "defaultUnit", "standardShelfLifeDays",
        "minTempCelsius", "maxTempCelsius", "decayRateExponent",
        "defaultPricePerUnit", "defaultCostPerUnit", "wasteDisposalCostPerKg"
    ]
    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for c in COMMODITIES_54:
            temp_matches = re.findall(r"[-+]?\d*\.?\d+", c["opt_temp"])
            if len(temp_matches) >= 2:
                min_temp = float(temp_matches[0])
                max_temp = float(temp_matches[1])
            elif len(temp_matches) == 1:
                min_temp = float(temp_matches[0])
                max_temp = min_temp + 3.0
            else:
                min_temp = 2.0
                max_temp = 5.0
            
            shelf_days = c["cold_shelf_days"]
            writer.writerow([
                c["code"], c["name"], c["category"], "KG", shelf_days,
                f"{min_temp:.1f}", f"{max_temp:.1f}", f"{c['decay_exp']:.2f}",
                f"{c['price_usd']:.2f}", f"{c['cost_usd']:.2f}", f"{c['waste_disp_usd']:.2f}"
            ])
    print(f"  Generated: {filepath} (54 commodities catalog)")

# --------------------------------------------------------------------------
# 8. WRITE FRESHROUTE INDIA WAREHOUSES CSV
# --------------------------------------------------------------------------
def generate_freshroute_warehouses_csv():
    filepath = os.path.join(DATA_DIR, "freshroute_india_warehouses.csv")
    fields = [
        "code", "name", "address", "city", "state", "postalCode",
        "latitude", "longitude", "totalCapacityKg", "totalVolumeM3", "coldStorageType"
    ]
    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for w in INDIAN_WAREHOUSES:
            writer.writerow([
                w["code"], w["name"], w["address"], w["city"], w["state"], w["postalCode"],
                f"{w['latitude']:.6f}", f"{w['longitude']:.6f}",
                f"{w['totalCapacityKg']:.2f}", f"{w['totalVolumeM3']:.2f}", w["coldStorageType"]
            ])
    print(f"  Generated: {filepath} (15 Agro-Zone warehouses)")

# --------------------------------------------------------------------------
# 9. WRITE OPERATIONAL INVENTORY CSV (MATCHING InventoryCsvRowSchema)
# --------------------------------------------------------------------------
# Headers: batchCode,commodityCode,warehouseCode,initialQuantityKg,qualityGrade,unitCostUsd,basePriceUsd,harvestDate,expiryDate,storageTempCelsius
def generate_operational_inventory_csv():
    filepath = os.path.join(DATA_DIR, "freshroute_inventory_mofpi_data.csv")
    fields = [
        "batchCode", "commodityCode", "warehouseCode", "initialQuantityKg",
        "qualityGrade", "unitCostUsd", "basePriceUsd", "harvestDate", "expiryDate", "storageTempCelsius"
    ]
    
    # Base reference date: October 14, 2026
    ref_date = datetime(2026, 10, 14, 0, 0, 0)
    
    # Select high-perishable crops across key zones for active distribution planning
    sample_batches = [
        # Zone I (Western Himalayan): Apple & Mushroom
        {"batch": "BATCH-APP-SHI-01", "cmd": "CMD-APP-01", "wh": "DC-AZ01-SHI", "qty": 12500.0, "grade": "GRADE_A", "cost": 1.15, "price": 1.85, "h_offset": -8, "e_offset": 24, "temp": 1.0},
        {"batch": "BATCH-MSH-SHI-02", "cmd": "CMD-MSH-01", "wh": "DC-AZ01-SHI", "qty": 1800.0, "grade": "GRADE_A", "cost": 1.40, "price": 2.30, "h_offset": -2, "e_offset": 5, "temp": 2.0},
        
        # Zone IV (Middle Gangetic): Tomato & Guava (Highest losses in study)
        {"batch": "BATCH-TOM-VAR-03", "cmd": "CMD-TOM-01", "wh": "DC-AZ04-VAR", "qty": 15000.0, "grade": "GRADE_A", "cost": 0.28, "price": 0.52, "h_offset": -3, "e_offset": 8, "temp": 11.5},
        {"batch": "BATCH-GUA-VAR-04", "cmd": "CMD-GUA-01", "wh": "DC-AZ04-VAR", "qty": 6500.0, "grade": "GRADE_B", "cost": 0.35, "price": 0.65, "h_offset": -2, "e_offset": 4, "temp": 9.0}, # Urgent dispatch candidate
        
        # Zone VI (Trans-Gangetic): Citrus & Cauliflower
        {"batch": "BATCH-CTR-DEL-05", "cmd": "CMD-CTR-01", "wh": "DC-AZ06-DEL", "qty": 20000.0, "grade": "GRADE_A", "cost": 0.42, "price": 0.72, "h_offset": -5, "e_offset": 22, "temp": 6.0},
        {"batch": "BATCH-CAU-DEL-06", "cmd": "CMD-CAU-01", "wh": "DC-AZ06-DEL", "qty": 8500.0, "grade": "GRADE_A", "cost": 0.24, "price": 0.44, "h_offset": -3, "e_offset": 10, "temp": 1.5},
        
        # Zone IX (Western Plateau): Grapes, Onion, Pomegranate
        {"batch": "BATCH-GRP-NAS-07", "cmd": "CMD-GRP-01", "wh": "DC-AZ09-NAS", "qty": 14000.0, "grade": "GRADE_A", "cost": 0.88, "price": 1.45, "h_offset": -4, "e_offset": 18, "temp": 0.5},
        {"batch": "BATCH-ONN-NAS-08", "cmd": "CMD-ONN-01", "wh": "DC-AZ09-NAS", "qty": 45000.0, "grade": "GRADE_B", "cost": 0.18, "price": 0.36, "h_offset": -15, "e_offset": 75, "temp": 1.0},
        {"batch": "BATCH-POM-NAS-09", "cmd": "CMD-POM-01", "wh": "DC-AZ09-NAS", "qty": 9000.0, "grade": "GRADE_A", "cost": 0.95, "price": 1.55, "h_offset": -6, "e_offset": 35, "temp": 5.5},
        
        # Zone X (Southern Plateau): Mango & Green Gram
        {"batch": "BATCH-MGO-BLR-10", "cmd": "CMD-MGO-01", "wh": "DC-AZ10-BLR", "qty": 11000.0, "grade": "GRADE_A", "cost": 0.65, "price": 1.15, "h_offset": -4, "e_offset": 12, "temp": 12.0},
        {"batch": "BATCH-MNG-BLR-11", "cmd": "CMD-MNG-01", "wh": "DC-AZ10-BLR", "qty": 18000.0, "grade": "GRADE_A", "cost": 0.82, "price": 1.18, "h_offset": -12, "e_offset": 140, "temp": 16.0},
        
        # Zone XI (East Coast): Marine Fisheries & Inland Fisheries
        {"batch": "BATCH-FSH-VIZ-12", "cmd": "CMD-FSH-MAR-01", "wh": "DC-AZ11-VIZ", "qty": 5500.0, "grade": "GRADE_A", "cost": 2.40, "price": 3.90, "h_offset": -1, "e_offset": 5, "temp": 0.0},
        {"batch": "BATCH-FSH-KOL-13", "cmd": "CMD-FSH-INL-01", "wh": "DC-AZ03-KOL", "qty": 4800.0, "grade": "GRADE_A", "cost": 1.70, "price": 2.65, "h_offset": -1, "e_offset": 4, "temp": 1.0},
        
        # Zone XIII (Gujarat): Potato & Milk
        {"batch": "BATCH-POT-AHM-14", "cmd": "CMD-POT-01", "wh": "DC-AZ13-AHM", "qty": 35000.0, "grade": "GRADE_A", "cost": 0.15, "price": 0.29, "h_offset": -10, "e_offset": 90, "temp": 8.5},
        {"batch": "BATCH-MLK-AHM-15", "cmd": "CMD-MLK-01", "wh": "DC-AZ13-AHM", "qty": 25000.0, "grade": "GRADE_A", "cost": 0.44, "price": 0.64, "h_offset": -1, "e_offset": 3, "temp": 3.0}
    ]

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields)
        for b in sample_batches:
            h_date = (ref_date + timedelta(days=b["h_offset"])).strftime("%Y-%m-%d")
            e_date = (ref_date + timedelta(days=b["e_offset"])).strftime("%Y-%m-%d")
            writer.writerow([
                b["batch"], b["cmd"], b["wh"], f"{b['qty']:.2f}",
                b["grade"], f"{b['cost']:.2f}", f"{b['price']:.2f}",
                h_date, e_date, f"{b['temp']:.1f}"
            ])
    print(f"  Generated: {filepath} ({len(sample_batches)} inventory batches)")

# --------------------------------------------------------------------------
# 10. WRITE OPERATIONAL DESTINATIONS & DEMAND CSV (MATCHING DestinationDemandCsvRowSchema)
# --------------------------------------------------------------------------
# Headers: destinationCode,destinationName,tier,address,city,state,postalCode,latitude,longitude,minShelfLifeDays,acceptsDiscounts,commodityCode,orderNumber,requestedQuantityKg,contractedPricePerKg,deliveryWindowStart,deliveryWindowEnd
def generate_operational_destinations_demand_csv():
    filepath = os.path.join(DATA_DIR, "freshroute_destinations_demand_mofpi_data.csv")
    fields = [
        "destinationCode,destinationName,tier,address,city,state,postalCode,latitude,longitude,minShelfLifeDays,acceptsDiscounts,commodityCode,orderNumber,requestedQuantityKg,contractedPricePerKg,deliveryWindowStart,deliveryWindowEnd"
    ]
    
    demand_orders = [
        # Delhi NCR Buyer: BigBasket Central Fulfillment (Requires 4d RSL for Tomato)
        {
            "code": "DEST-DEL-BB-01", "name": "BigBasket North Hub", "tier": "PREMIUM_GROCER",
            "address": "Bijwasan Logistics Zone", "city": "New Delhi", "state": "DL", "postalCode": "110061",
            "lat": 28.5355, "lng": 77.0600, "rsl": 4, "disc": "false",
            "cmd": "CMD-TOM-01", "order": "ORD-DEL-TOM-101", "qty": 8000.0, "price": 0.58,
            "win_start": "2026-10-16T06:00:00Z", "win_end": "2026-10-17T18:00:00Z"
        },
        # Mother Dairy Delhi: Food Service Processor for Tomato Pur e (Accepts discounts / lower shelf-life)
        {
            "code": "DEST-DEL-MD-02", "name": "Mother Dairy Fruit & Veg Processing", "tier": "FOOD_SERVICE_PROCESSOR",
            "address": "Mangolpuri Industrial Area", "city": "New Delhi", "state": "DL", "postalCode": "110083",
            "lat": 28.6925, "lng": 77.0988, "rsl": 2, "disc": "true",
            "cmd": "CMD-TOM-01", "order": "ORD-DEL-TOM-102", "qty": 6000.0, "price": 0.45,
            "win_start": "2026-10-16T04:00:00Z", "win_end": "2026-10-17T14:00:00Z"
        },
        # Natures Basket Delhi: Premium Apples (Requires 10d RSL)
        {
            "code": "DEST-DEL-NB-03", "name": "Natures Basket Defense Colony", "tier": "PREMIUM_GROCER",
            "address": "Ring Road South Ex", "city": "New Delhi", "state": "DL", "postalCode": "110024",
            "lat": 28.5733, "lng": 77.2215, "rsl": 10, "disc": "false",
            "cmd": "CMD-APP-01", "order": "ORD-DEL-APP-103", "qty": 5000.0, "price": 1.95,
            "win_start": "2026-10-16T08:00:00Z", "win_end": "2026-10-17T20:00:00Z"
        },
        # Reliance Fresh Mumbai: Nashik Grapes (Requires 6d RSL)
        {
            "code": "DEST-MUM-RF-04", "name": "Reliance Retail Kurla Mega Terminal", "tier": "REGIONAL_SUPERMARKET",
            "address": "LBS Marg Kurla West", "city": "Mumbai", "state": "MH", "postalCode": "400070",
            "lat": 19.0688, "lng": 72.8789, "rsl": 6, "disc": "false",
            "cmd": "CMD-GRP-01", "order": "ORD-MUM-GRP-104", "qty": 8000.0, "price": 1.55,
            "win_start": "2026-10-16T05:00:00Z", "win_end": "2026-10-17T16:00:00Z"
        },
        # DMart Mumbai: Onions Bulk Discount Channel
        {
            "code": "DEST-MUM-DM-05", "name": "DMart Apex Depot Kalamboli", "tier": "DISCOUNT_CHAIN",
            "address": "Kalamboli Steel Market Road", "city": "Navi Mumbai", "state": "MH", "postalCode": "410218",
            "lat": 19.0144, "lng": 73.1030, "rsl": 20, "disc": "true",
            "cmd": "CMD-ONN-01", "order": "ORD-MUM-ONN-105", "qty": 25000.0, "price": 0.32,
            "win_start": "2026-10-17T08:00:00Z", "win_end": "2026-10-19T22:00:00Z"
        },
        # Blinkit Bangalore: Fresh Mushrooms (Requires 2d RSL, fast turn)
        {
            "code": "DEST-BLR-BL-06", "name": "Blinkit Dark Store Indiranagar", "tier": "PREMIUM_GROCER",
            "address": "100 Feet Road", "city": "Bengaluru", "state": "KA", "postalCode": "560038",
            "lat": 12.9784, "lng": 77.6408, "rsl": 2, "disc": "false",
            "cmd": "CMD-MSH-01", "order": "ORD-BLR-MSH-106", "qty": 1200.0, "price": 2.45,
            "win_start": "2026-10-16T04:00:00Z", "win_end": "2026-10-16T12:00:00Z"
        },
        # Zepto Bangalore: Alphonso / Banganapalle Mangoes
        {
            "code": "DEST-BLR-ZP-07", "name": "Zepto Micro-Hub Whitefield", "tier": "PREMIUM_GROCER",
            "address": "ITPL Main Road", "city": "Bengaluru", "state": "KA", "postalCode": "560066",
            "lat": 12.9698, "lng": 77.7500, "rsl": 5, "disc": "false",
            "cmd": "CMD-MGO-01", "order": "ORD-BLR-MGO-107", "qty": 4500.0, "price": 1.25,
            "win_start": "2026-10-16T07:00:00Z", "win_end": "2026-10-17T19:00:00Z"
        },
        # Metro Cash & Carry Kolkata: Chilled Marine Fish
        {
            "code": "DEST-KOL-MC-08", "name": "Metro Cash & Carry Ajoy Nagar", "tier": "FOOD_SERVICE_PROCESSOR",
            "address": "EM Bypass", "city": "Kolkata", "state": "WB", "postalCode": "700075",
            "lat": 22.4965, "lng": 88.3986, "rsl": 3, "disc": "false",
            "cmd": "CMD-FSH-MAR-01", "order": "ORD-KOL-FSH-108", "qty": 3500.0, "price": 4.10,
            "win_start": "2026-10-16T04:00:00Z", "win_end": "2026-10-16T16:00:00Z"
        },
        # Haldiram Snacks Noida: Potatoes for French Fries / Chips
        {
            "code": "DEST-NOI-HD-09", "name": "Haldiram Snack Processing Unit", "tier": "FOOD_SERVICE_PROCESSOR",
            "address": "Sector 63 Industrial Hub", "city": "Noida", "state": "UP", "postalCode": "201301",
            "lat": 28.6258, "lng": 77.3789, "rsl": 30, "disc": "true",
            "cmd": "CMD-POT-01", "order": "ORD-NOI-POT-109", "qty": 20000.0, "price": 0.26,
            "win_start": "2026-10-17T06:00:00Z", "win_end": "2026-10-19T18:00:00Z"
        },
        # Kissan / Hindustan Unilever Nashik: Guava Pulp Markdown Buyer
        {
            "code": "DEST-NAS-UN-10", "name": "HUL Kissan Jam & Pulp Facility", "tier": "FOOD_SERVICE_PROCESSOR",
            "address": "Ambad MIDC Area", "city": "Nashik", "state": "MH", "postalCode": "422010",
            "lat": 19.9572, "lng": 73.7428, "rsl": 1, "disc": "true",
            "cmd": "CMD-GUA-01", "order": "ORD-NAS-GUA-110", "qty": 5000.0, "price": 0.50,
            "win_start": "2026-10-16T04:00:00Z", "win_end": "2026-10-16T18:00:00Z"
        }
    ]

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields[0].split(","))
        for d in demand_orders:
            writer.writerow([
                d["code"], d["name"], d["tier"], d["address"], d["city"], d["state"], d["postalCode"],
                f"{d['lat']:.6f}", f"{d['lng']:.6f}", d["rsl"], d["disc"],
                d["cmd"], d["order"], f"{d['qty']:.2f}", f"{d['price']:.2f}",
                d["win_start"], d["win_end"]
            ])
    print(f"  Generated: {filepath} ({len(demand_orders)} demand orders)")

# --------------------------------------------------------------------------
# 11. WRITE OPERATIONAL TRANSPORT ROUTES CSV (MATCHING TransportCsvRowSchema)
# --------------------------------------------------------------------------
# Headers: routeCode,originWarehouseCode,destinationRegion,carrierName,vehicleType,maxWeightCapacityKg,fixedTripCostUsd,variableCostPerKgUsd,transitDurationHours,handlingDurationHours,departureTime,estimatedArrivalTime
def generate_operational_transport_routes_csv():
    filepath = os.path.join(DATA_DIR, "freshroute_transport_routes_mofpi_data.csv")
    fields = [
        "routeCode,originWarehouseCode,destinationRegion,carrierName,vehicleType,maxWeightCapacityKg,fixedTripCostUsd,variableCostPerKgUsd,transitDurationHours,handlingDurationHours,departureTime,estimatedArrivalTime"
    ]
    
    transport_routes = [
        # Route 1: Shimla -> Delhi NCR (Apples & Mushrooms)
        {
            "code": "RT-SHI-DEL-01", "origin": "DC-AZ01-SHI", "region": "Delhi National Capital Region",
            "carrier": "ColdEx Reefer Logistics", "vehicle": "REEFER_HEAVY_TRUCK",
            "capacity": 15000.0, "fixed": 350.0, "var": 0.045, "transit": 7.5, "handling": 0.75,
            "dep": "2026-10-16T04:00:00Z", "arr": "2026-10-16T12:15:00Z"
        },
        # Route 2: Varanasi -> Delhi NCR (Middle Gangetic Tomatoes & Guavas)
        {
            "code": "RT-VAR-DEL-02", "origin": "DC-AZ04-VAR", "region": "Delhi National Capital Region",
            "carrier": "Snowman Multimodal Reefer", "vehicle": "REEFER_53FT_MULTI_ZONE",
            "capacity": 18000.0, "fixed": 520.0, "var": 0.055, "transit": 12.0, "handling": 1.0,
            "dep": "2026-10-16T03:00:00Z", "arr": "2026-10-16T16:00:00Z"
        },
        # Route 3: Nashik -> Mumbai MMR (Western Plateau Grapes, Onions, Pomegranates)
        {
            "code": "RT-NAS-MUM-03", "origin": "DC-AZ09-NAS", "region": "Mumbai Metropolitan Region",
            "carrier": "TCI Fresh Reefer Express", "vehicle": "REEFER_HEAVY_TRUCK",
            "capacity": 16000.0, "fixed": 280.0, "var": 0.035, "transit": 4.5, "handling": 0.50,
            "dep": "2026-10-16T05:00:00Z", "arr": "2026-10-16T10:00:00Z"
        },
        # Route 4: Bengaluru -> Bengaluru Urban / Indiranagar / Whitefield Dark Stores
        {
            "code": "RT-BLR-CITY-04", "origin": "DC-AZ10-BLR", "region": "Bengaluru Urban Corridor",
            "carrier": "Mahindra Reefer Fleet", "vehicle": "REEFER_MEDIUM_TRUCK",
            "capacity": 8000.0, "fixed": 160.0, "var": 0.025, "transit": 2.5, "handling": 0.50,
            "dep": "2026-10-16T04:30:00Z", "arr": "2026-10-16T07:30:00Z"
        },
        # Route 5: Visakhapatnam -> Kolkata (East Coast Marine Seafood Corridor)
        {
            "code": "RT-VIZ-KOL-05", "origin": "DC-AZ11-VIZ", "region": "Greater Kolkata Metropolitan",
            "carrier": "Blue Dart Chilled Cargo", "vehicle": "REEFER_53FT_MULTI_ZONE",
            "capacity": 14000.0, "fixed": 680.0, "var": 0.075, "transit": 14.5, "handling": 1.0,
            "dep": "2026-10-16T02:00:00Z", "arr": "2026-10-16T17:30:00Z"
        },
        # Route 6: Ahmedabad -> Delhi NCR (Potatoes & Dairy)
        {
            "code": "RT-AHM-DEL-06", "origin": "DC-AZ13-AHM", "region": "Delhi National Capital Region",
            "carrier": "Amul Cold Line Express", "vehicle": "REEFER_53FT_MULTI_ZONE",
            "capacity": 22000.0, "fixed": 620.0, "var": 0.060, "transit": 15.0, "handling": 1.0,
            "dep": "2026-10-16T01:00:00Z", "arr": "2026-10-16T17:00:00Z"
        }
    ]

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(fields[0].split(","))
        for r in transport_routes:
            writer.writerow([
                r["code"], r["origin"], r["region"], r["carrier"], r["vehicle"],
                f"{r['capacity']:.2f}", f"{r['fixed']:.2f}", f"{r['var']:.3f}",
                f"{r['transit']:.2f}", f"{r['handling']:.2f}",
                r["dep"], r["arr"]
            ])
    print(f"  Generated: {filepath} ({len(transport_routes)} transport routes)")


if __name__ == "__main__":
    print("  Starting MoFPI Post-Harvest Dataset Generation for FreshRoute SaaS...")
    generate_54_commodities_csv()
    generate_15_zones_csv()
    generate_zone_commodity_matrix_csv()
    generate_freshroute_commodity_catalog_csv()
    generate_freshroute_warehouses_csv()
    generate_operational_inventory_csv()
    generate_operational_destinations_demand_csv()
    generate_operational_transport_routes_csv()
    print("  All 8 MoFPI Post-Harvest CSV datasets successfully generated in:", DATA_DIR)

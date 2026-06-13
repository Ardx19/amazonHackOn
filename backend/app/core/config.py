# backend/app/core/config.py
# Central config — no hardcoded values anywhere else in the project

import os

# ─── Database ──────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/reroute",
)

# ─── AWS Config ───────────────────────────────────────────────────────────────

AWS_REGION = "ap-south-1"
BEDROCK_MODEL_GRADING = "apac.amazon.nova-lite-v1:0"
# Health card prose uses Amazon Nova (already enabled) rather than Anthropic
# Claude — Claude requires a separate Bedrock use-case approval form. Staying on
# Nova keeps the whole pipeline inside the Amazon AI ecosystem.
BEDROCK_MODEL_HEALTH_CARD = "apac.amazon.nova-lite-v1:0"
REKOGNITION_MAX_LABELS = 20
REKOGNITION_MIN_CONFIDENCE = 70

# Public base URL the Health Card QR code resolves to. The frontend route at
# {base}/{card_uuid} should fetch GET /api/health-card/{card_uuid} and render it.
HEALTH_CARD_BASE_URL = os.getenv("HEALTH_CARD_BASE_URL", "https://reroute.demo/card")

# ─── Condition Grades ─────────────────────────────────────────────────────────

CONDITION_GRADES = ["Like New", "Good", "Fair", "Poor"]
CONDITION_MULTIPLIERS = {
    "Like New": 0.95,
    "Good": 0.60,
    "Fair": 0.35,
    "Poor": 0.15,
}

# ─── Routing Paths ────────────────────────────────────────────────────────────

ROUTE_PATHS = [
    "amazon_renewed",
    "reroute_deals",
    "relist",
    "donate",
    "recycle",
    "standard_return",
]

RENEWED_MIN_VALUE = 2000
DONATE_MAX_MVSP = 0
RECYCLE_CONDITION = "Poor"

# ─── Routing Thresholds ────────────────────────────────────────────────────────

OVERHEAD_RATIO_THRESHOLD = 0.07
GRADING_CONFIDENCE_THRESHOLD = 0.85
MIN_PROFIT_MARGIN = 0.01
OPERATING_CHARGE_PCT = 0.08

# ─── Floating Discount Economic Model (Scenario 1: Priya return) ──────────────
# The price Priya originally paid decomposes as: original_price = C + p + d
#   C = COGS (Amazon's cost to source the goods)
#   p = original profit margin
#   d = original last-mile delivery cost (warehouse -> Priya)
# MRP ceiling (price of a new unit, no delivery) = C + p
#
# DEMO NOTE: Amazon knows C, p, and d exactly from its internal OMS/WMS.
# Here we approximate them as fixed ratios of the original price purely for the
# simulation. The ratios sum to 1.0.
COGS_RATIO = 0.55              # C  as fraction of original price
MARGIN_RATIO = 0.30            # p  as fraction of original price
ORIGINAL_DELIVERY_RATIO = 0.15  # d  as fraction of original price
MRP_RATIO = COGS_RATIO + MARGIN_RATIO  # 0.85 — ceiling resale price (C + p)

# ─── Ring Price Floors ─────────────────────────────────────────────────────────

RING_PRICE_FLOORS = {
    0: 0.88,
    1: 0.91,
    2: 0.93,
    3: 0.95,
    4: 0.97,
    5: 1.00,
}
RING_PRICE_INCREMENT = 0.02

# ─── Hub Zone Data ────────────────────────────────────────────────────────────

HUB_ZONES = {
    "MUM_H1": {"name": "Andheri Hub", "city": "Mumbai", "lat": 19.1136, "lng": 72.8697},
    "MUM_H2": {"name": "Thane Hub", "city": "Mumbai", "lat": 19.2183, "lng": 72.9781},
    "MUM_H3": {"name": "Kalyan Hub", "city": "Mumbai", "lat": 19.2403, "lng": 73.1305},
    "MUM_W": {
        "name": "Bhiwandi Warehouse",
        "city": "Mumbai",
        "lat": 19.2813,
        "lng": 73.0587,
    },
}

# ─── Delivery Cost Per Km by Category ─────────────────────────────────────────

DELIVERY_COST_PER_KM = {
    "footwear": 2.5,
    "electronics": 3.5,
    "clothing": 2.0,
    "home_goods": 3.0,
    "baby_products": 2.8,
    "default": 3.0,
}

# ─── Radius Expansion Rules ───────────────────────────────────────────────────

INITIAL_RADIUS_KM = 15
RADIUS_EXPANSION_KM = 10
MAX_RADIUS_KM = 50

# ─── Floating Discount Formula Constants ──────────────────────────────────────

AMAZON_FEE_PCT = 0.05

# ─── S3 Buckets ──────────────────────────────────────────────────────────────

S3_BUCKET_IMAGES = "reroute-item-images-720800607906"
S3_BUCKET_HEALTH_CARDS = "reroute-health-cards-720800607906"

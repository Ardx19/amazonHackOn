# CONNECTORS — health_card/

## Status: NOT BUILT YET

## Owner: P1 (AI Pipeline)

## Depends on:
- shared/config.py ✅ (ready)
- shared/models.py ✅ (ready)
- shared/db.py ✅ (ready)

## Will receive (inputs):
- `item_id` + `GradingReport` (from grade_item lambda output)
- Seller info (user_id, name, city)

## Will return (outputs):
- `HealthCard` Pydantic model — card_id, card_url, QR code (base64 PNG), condition summary, seller info, immutable flag

## Key dependencies:
- Python `qrcode[pil]` — QR code generation
- S3 bucket: `reroute-health-cards` — store generated card HTML/images

## Open ends:
- [ ] QR code generation tested (base64 PNG output)
- [ ] Health card UUID format: HC-2026-MUM-{8char_hex}
- [ ] "Seller cannot edit" badge / watermark design
- [ ] Card HTML template (nutrition-label style from demo storyboard)

# ReRoute — FUTURE IDEAS
# Ideas surfaced during foundation layer build. Not in scope for this session.
# Evaluate during H42-48 contingency pool or V2 roadmap slide.

## Stretch Features (H42-48 contingency time)
- Real-time GPS integration for live hub tracking (currently hardcoded trajectories)
- Timer countdown showing "discount expires in XX:XX" on Tab 1
- More abuse rules beyond same-address block (same-payment-instrument, category cooldown, item hard block)
- Amazon Pay mock flow instead of "Buy" → "Confirmed!" screen
- Green Credits badge — environmental impact gamification
- Return Prevention — AI-suggested size/brand alternates before purchase

## V2 Roadmap (post-hackathon)
- India-wide warehouse and hub network (currently 4 Mumbai hubs hardcoded)
- Integrated into actual Amazon returns pipeline (currently standalone Lambda)
- Amazon Cognito authentication (currently hardcoded personas)
- Amazon Location Service maps with real-time marker (currently text-based distance)
- Full C2C buyer flow with payment, tracking, dispute resolution
- Machine learning pricing using comparable listings instead of fixed condition multipliers
- Dynamic radius expansion driven by real demand data

## Architecture notes (not for this demo)
- DynamoDB scan() is used for demo volumes only. Production would use GSI queries.
- Hub zones should be in DynamoDB, not hardcoded in config.py. Current approach is demo-only.
- Delivery cost per km should come from Amazon logistics API, not fixed constants.
- Condition multipliers should be market-driven, not fixed. Consider a pricing ML model.
- Rekognition DetectLabels may be unreliable for condition grading. Pure Claude Vision is fallback.

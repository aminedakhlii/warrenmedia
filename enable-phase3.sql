-- Quick Enable Phase 3 Features
-- Run this in Supabase SQL Editor to enable all Phase 3 features at once
-- Or use the UI at /admin/settings to toggle features individually

-- Enable all Phase 3 features
UPDATE feature_flags SET enabled = true WHERE feature_name = 'event_tracking';
UPDATE feature_flags SET enabled = true WHERE feature_name = 'ads_system';
UPDATE feature_flags SET enabled = true WHERE feature_name = 'creator_uploads';

-- Verify all flags are enabled
SELECT feature_name, enabled, description, updated_at 
FROM feature_flags 
ORDER BY feature_name;

-- Expected result: All three should show enabled = true
-- ✅ ads_system: true
-- ✅ creator_uploads: true
-- ✅ event_tracking: true


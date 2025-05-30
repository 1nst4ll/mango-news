-- Migration to add enable_scheduled_missing_translations setting to application_settings table

INSERT INTO application_settings (setting_name, setting_value)
VALUES ('enable_scheduled_missing_translations', 'true')
ON CONFLICT (setting_name) DO NOTHING;

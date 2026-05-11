ALTER TABLE project_environments
  DROP CONSTRAINT IF EXISTS project_environments_name_check,
  ADD CONSTRAINT project_environments_name_check
    CHECK (name IN ('dev', 'staging', 'prod', 'test', 'develop', 'production'));

ALTER TABLE event_validation_results
  DROP CONSTRAINT IF EXISTS event_validation_results_environment_check,
  ADD CONSTRAINT event_validation_results_environment_check
    CHECK (environment IN ('dev', 'staging', 'prod', 'test', 'develop', 'production'));

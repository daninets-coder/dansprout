ALTER TABLE reading_assessments
    DROP CONSTRAINT IF EXISTS reading_assessments_review_status_check;

ALTER TABLE reading_assessments
    ADD CONSTRAINT reading_assessments_review_status_check
    CHECK (review_status IN ('pending', 'auto_scored', 'reviewed', 'corrected'));

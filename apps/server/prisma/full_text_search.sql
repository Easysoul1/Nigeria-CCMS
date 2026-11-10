-- Full-text search index (title + ocr_text), exposed only to authorised roles via API.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE documents d
SET search_vector = to_tsvector('english', coalesce((SELECT title FROM cases WHERE id=d.case_id),'') || ' ' || coalesce(d.ocr_text,''))
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS documents_search_vector_idx
  ON documents USING GIN (search_vector);

CREATE OR REPLACE FUNCTION documents_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce((SELECT title FROM cases WHERE id=NEW.case_id),'') || ' ' || coalesce(NEW.ocr_text,''));
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_search_vector_update ON documents;
CREATE TRIGGER documents_search_vector_update
  BEFORE INSERT OR UPDATE OF ocr_text ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_trigger();

-- Enable Realtime for tables needed by the map live pin updates
ALTER PUBLICATION supabase_realtime ADD TABLE inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE deficiencies;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

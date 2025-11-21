CREATE POLICY "Enable full access for service_role on analysis_jobs"
ON public.analysis_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

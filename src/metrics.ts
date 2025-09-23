import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from 'prom-client';

// Collect default metrics
collectDefaultMetrics({ prefix: 'temporal_app_' });

// Custom workflow metrics
export const workflowExecutions = new Counter({
  name: 'temporal_workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow_type', 'status'],
});

export const workflowDuration = new Histogram({
  name: 'temporal_workflow_duration_seconds',
  help: 'Workflow execution duration in seconds',
  labelNames: ['workflow_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
});

export const workflowRetries = new Counter({
  name: 'temporal_workflow_retries_total',
  help: 'Total number of workflow retries',
  labelNames: ['workflow_type', 'retry_reason'],
});

export const activeWorkflows = new Gauge({
  name: 'temporal_active_workflows',
  help: 'Number of currently active workflows',
  labelNames: ['workflow_type'],
});

// Activity metrics
export const activityExecutions = new Counter({
  name: 'temporal_activity_executions_total',
  help: 'Total number of activity executions',
  labelNames: ['activity_name', 'status'],
});

export const activityDuration = new Histogram({
  name: 'temporal_activity_duration_seconds',
  help: 'Activity execution duration in seconds',
  labelNames: ['activity_name'],
  buckets: [0.01, 0.1, 0.5, 1, 5, 10],
});

export const activityRetries = new Counter({
  name: 'temporal_activity_retries_total',
  help: 'Total number of activity retries',
  labelNames: ['activity_name'],
});

// Business metrics
export const dataProcessedRecords = new Counter({
  name: 'temporal_data_processed_records_total',
  help: 'Total number of data records processed',
  labelNames: ['source', 'status'],
});

export const apiCallsTotal = new Counter({
  name: 'temporal_api_calls_total',
  help: 'Total number of external API calls',
  labelNames: ['endpoint', 'status'],
});

export const dataStorageOperations = new Counter({
  name: 'temporal_storage_operations_total',
  help: 'Total number of data storage operations',
  labelNames: ['operation', 'status'],
});

// Export the registry
export { register };

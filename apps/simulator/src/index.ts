import { SimulatorService } from './runner';

export * from './deterministic-dataset';
export * from './runner';

if (require.main === module) {
  console.log('=====================================================');
  console.log('SmartLight OS — IoT Fleet Simulator Engine (Prompt 0)');
  console.log('=====================================================');
  const service = new SimulatorService();
  console.log('Generating initial deterministic telemetry snapshot:');
  const snapshots = service.generateAllCurrentTelemetry();
  for (const s of snapshots) {
    console.log(JSON.stringify(s));
  }
}

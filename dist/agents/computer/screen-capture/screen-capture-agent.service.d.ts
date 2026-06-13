import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SCREEN_CAPTURE_AGENT_CONFIG: AgentConfig;
export declare class ScreenCaptureAgentService extends BaseAgentService {
    private captures;
    private recordings;
    private captureCounter;
    private recordingCounter;
    private displayResolution;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private captureScreen;
    private captureWindow;
    private captureRegion;
    private startRecording;
    private stopRecording;
    private generateCaptureId;
}

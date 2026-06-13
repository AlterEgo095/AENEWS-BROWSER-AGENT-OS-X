import { CapabilityId, CapabilityPack } from '../interfaces';
import { ICapabilityConnector, ConnectorInput, ConnectorOutput } from './connector.interface';
export declare class BrowserConnector implements ICapabilityConnector {
    readonly supportedPack = CapabilityPack.BROWSER;
    private readonly logger;
    private readonly llm;
    private static readonly browserPool;
    private static readonly BROWSER_CAPABILITIES;
    supports(capabilityId: CapabilityId): boolean;
    execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput>;
    private executeScreenshot;
    private executeNavigation;
    private executeLogin;
    private executeSearch;
    private executeForm;
    private executeVision;
    private executeOCR;
    private executeDownload;
    private executeUpload;
    private executeSession;
    private executeCookie;
    private executePopup;
    private executeGenericBrowser;
    private makeArtifact;
    private missingParamResult;
    private playwrightFallback;
}

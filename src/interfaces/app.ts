export interface scriptParams {
    name: string;
    value: string;
    type: string;
  }
  export interface ScriptApplication {
    script: string;
    scriptParams: scriptParams[];
  }
  export interface app {
    self: string;
    ScriptApplication: ScriptApplication;
    id: string;
    applicationName: string;
    type: string;
    description: string;
    maxsession: number;
    enabled: string;
  }
  export interface parsedApps {
    name: string;
    type: string;
    nodes: any;
  }
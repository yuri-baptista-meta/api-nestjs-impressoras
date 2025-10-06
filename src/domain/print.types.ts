export type PrinterState = 'IDLE' | 'PRINTING' | 'STOPPED' | 'UNKNOWN';

export interface DiscoveredPrinter {
  name: string;
  uri: string;                 // ipp(s)://host:631/printers/<name>
  location?: string;
  isDefault?: boolean;
  state: PrinterState;
  makeAndModel?: string;
  colorSupported?: boolean;
  sidesSupported?: string[];
  mediaSupported?: string[];
}

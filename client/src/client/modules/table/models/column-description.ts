export class ColumnDescription {
  title: string;
  dataType: string;
  key?: string;
  actions?: Array<string>;
  hideOnMobile?: boolean;
  customSort?: Function;
  cssClass?: string;
  options?: {
    idName?: string;
    noIcon?: boolean;
    tooltipType?: string;
  };
}

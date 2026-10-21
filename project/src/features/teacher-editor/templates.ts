import bundleJson from '../../../content/t14/templates.json';
import type {ContentBundle,Puzzle} from '../../core/content.generated';

export const T14_TEMPLATE_BUNDLE=bundleJson as ContentBundle;
export const T14_TEMPLATES=T14_TEMPLATE_BUNDLE.items.filter((item):item is Puzzle=>item.kind==='Puzzle');
export const TEMPLATE_TITLES:Record<string,string>={
  'TEMPLATE-LIB-001':'数气模板',
  'TEMPLATE-CAP-001':'一步提子模板',
  'TEMPLATE-LIFE-001':'基础死活模板',
  'TEMPLATE-DISC-001':'开放讨论模板',
};

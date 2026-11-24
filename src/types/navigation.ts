export interface NavItem {
  id: string;
  label: string;
  labelBn: string;
  href: string;
  iconName: string;
  badge?: string;
  phase: string;
  description: string;
}

export interface NavGroup {
  id: string;
  label: string;
  labelBn: string;
  items: NavItem[];
}

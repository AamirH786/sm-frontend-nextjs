interface ModuleConfig {
  name: string;
  icon?: string;
  description?: string;
}

const moduleConfigs: Record<string, ModuleConfig> = {
  dashboard: {
    name: 'Dashboard',
    description: 'Main dashboard',
  },
  masters: {
    name: 'Masters',
    description: 'Master data management',
  },
  stocks: {
    name: 'Stocks',
    description: 'Stock management',
  },
  'purchase-book': {
    name: 'Purchase Book',
    description: 'Purchase management',
  },
  'order-book': {
    name: 'Order Book',
    description: 'Order management',
  },
  'job-details': {
    name: 'Job Details',
    description: 'Job management',
  },
  'roles-users': {
    name: 'Employees & Access',
    description: 'Employee and role management',
  },
};

export function getModuleConfig(moduleKey: string): ModuleConfig | undefined {
  return moduleConfigs[moduleKey];
}

export default moduleConfigs;

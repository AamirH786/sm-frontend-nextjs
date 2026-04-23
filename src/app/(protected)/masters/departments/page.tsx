'use client';

import SimpleMasterCrudPage from '@/components/masters/SimpleMasterCrudPage';
import { departmentsService } from '@/services/mastersService';

export default function DepartmentsPage() {
  return (
    <SimpleMasterCrudPage
      title="Departments"
      singularLabel="Department"
      moduleSlug="department"
      service={departmentsService}
    />
  );
}

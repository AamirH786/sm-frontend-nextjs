'use client';

import SimpleMasterCrudPage from '@/components/masters/SimpleMasterCrudPage';
import { designationsService } from '@/services/mastersService';

export default function DesignationsPage() {
  return (
    <SimpleMasterCrudPage
      title="Designations"
      singularLabel="Designation"
      moduleSlug="designation"
      service={designationsService}
    />
  );
}

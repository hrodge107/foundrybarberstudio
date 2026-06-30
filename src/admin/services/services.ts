import { supabase } from '../../shared/services/supabaseClient';
import type { Service, ServiceData } from '../../shared/types/service';

export async function getServicesAdmin(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price, description, image_url, category_name')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveService(serviceData: ServiceData): Promise<void> {
  if (serviceData.id) {
    // Update
    const { error } = await supabase
      .from('services')
      .update({
        name: serviceData.name,
        duration_minutes: serviceData.duration_minutes,
        price: serviceData.price,
        description: serviceData.description,
        image_url: serviceData.image_url,
        category_name: serviceData.category_name,
      })
      .eq('id', serviceData.id);
    if (error) throw error;
  } else {
    // Create
    const { error } = await supabase
      .from('services')
      .insert([{
        name: serviceData.name,
        duration_minutes: serviceData.duration_minutes,
        price: serviceData.price,
        description: serviceData.description,
        image_url: serviceData.image_url,
        category_name: serviceData.category_name,
      }]);
    if (error) throw error;
  }
}

export async function saveCategory(newCategoryName: string, oldCategoryName: string | null): Promise<void> {
  if (oldCategoryName) {
    // Rename category across existing services
    const { error } = await supabase
      .from('services')
      .update({ category_name: newCategoryName })
      .eq('category_name', oldCategoryName);
    if (error) throw error;
  }
}

export async function deleteService(serviceId: number): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);
  if (error) throw error;
}

export async function deleteCategory(categoryName: string): Promise<void> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('category_name', categoryName);
  if (error) throw error;
}

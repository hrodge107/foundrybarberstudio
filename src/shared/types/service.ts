export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
  description: string;
  image_url: string;
  category_name: string;
}

export interface ServiceData {
  id?: number;
  name: string;
  duration_minutes: number;
  price: number;
  description: string;
  image_url: string;
  category_name: string;
}

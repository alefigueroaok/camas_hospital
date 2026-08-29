insert into public.hospital_usuarios (persona_id, hospital_id, rol, profesion_funcion)
select p.id, h.id, 'administracion', 'Director'
from public.personas p, public.hospitales h
where p.dni = '31494217'
  and h.nombre = 'Hospital Zonal de Fernandez';

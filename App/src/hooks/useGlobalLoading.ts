import useAuthStore from '../store/AuthStore';
import useDriverStore from '../store/DriverStore';
import useTripStore from '../store/TripStore';
import useVehicleStore from '../store/VehicleStore';

export default function useGlobalLoading() {
  const authLoading = useAuthStore(state => state.loading);
  const vehicleLoading = useVehicleStore(state => state.loading);
  const tripLoading = useTripStore(state => state.loading);
  const driverLoading = useDriverStore(state => state.loading);

  return Boolean(authLoading || vehicleLoading || tripLoading || driverLoading);
}

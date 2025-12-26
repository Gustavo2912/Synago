import { useUser } from "@/contexts/UserContext";

export function usePermission() {
  const { permissions } = useUser();

  return (key: string) => {
    return Boolean(permissions[key]);
  };
}

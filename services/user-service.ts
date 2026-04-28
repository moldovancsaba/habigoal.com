export interface User {
  id: string;
  name: string;
  roles: ("conductor" | "observer")[];
}

export async function getUsers(): Promise<User[]> {
  const response = await fetch("/api/users").catch(() => null);
  if (response?.ok) {
    const data = await response.json();
    return data.users;
  }
  
  // Fallback
  return [
    { id: "1", name: "Kovács János", roles: ["conductor"] },
    { id: "2", name: "Nagy Anna", roles: ["conductor", "observer"] },
    { id: "3", name: "Szabó Péter", roles: ["observer"] },
  ];
}

export async function getConductors(): Promise<User[]> {
  const users = await getUsers();
  return users.filter(u => u.roles.includes("conductor"));
}

export async function getObservers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter(u => u.roles.includes("observer"));
}

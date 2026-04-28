export interface User {
  id: string;
  name: string;
  roles: ("conductor" | "observer")[];
}

// Mock data for initial development
const mockUsers: User[] = [
  { id: "1", name: "Kovács János", roles: ["conductor"] },
  { id: "2", name: "Nagy Anna", roles: ["conductor", "observer"] },
  { id: "3", name: "Szabó Péter", roles: ["observer"] },
];

export async function getUsers(): Promise<User[]> {
  // In a real app, this would fetch from MongoDB
  return mockUsers;
}

export async function getConductors(): Promise<User[]> {
  const users = await getUsers();
  return users.filter(u => u.roles.includes("conductor"));
}

export async function getObservers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter(u => u.roles.includes("observer"));
}

export function getRandomUsername() {
  const usernames = [
    "Angela",
    "Creed",
    "Darryl",
    "Dwight",
    "Hank",
    "Jim",
    "Karen",
    "Kelly",
    "Kevin",
    "Michael",
    "Mose",
    "Nate",
    "Oscar",
    "Pam",
    "Ryan",
    "Stanley",
    "Toby",
  ];
  return usernames[Math.floor(Math.random() * usernames.length)];
}

export function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360).toString()} 100% 85%)`;
}

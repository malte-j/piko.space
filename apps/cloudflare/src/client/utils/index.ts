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
  // y-prosemirror only accepts six-digit RGB colors for remote selections.
  const colors = [
    "#ffb3b3",
    "#ffd9b3",
    "#ffffb3",
    "#b3ffb3",
    "#b3ffff",
    "#b3d9ff",
    "#b3b3ff",
    "#d9b3ff",
    "#ffb3ff",
    "#ffb3d9",
  ] as const;

  return colors[Math.floor(Math.random() * colors.length)];
}

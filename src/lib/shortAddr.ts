export function shortAddr(address: string, edgeLength = 4): string {
  if (address.length <= edgeLength * 2 + 2) {
    return address;
  }

  return `${address.slice(0, edgeLength + 2)}…${address.slice(-edgeLength)}`;
}

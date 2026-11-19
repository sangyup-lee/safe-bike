export type Place = { id: string; name: string; address: string; lat: number; lng: number };
export const places: Place[] = [
  { id: "yeouido", name: "여의도 한강공원", address: "서울 영등포구 여의동로 330", lat: 37.5284, lng: 126.9346 },
  { id: "banpo", name: "반포 한강공원", address: "서울 서초구 신반포로11길 40", lat: 37.5107, lng: 126.9959 },
  { id: "yeouinaru", name: "여의나루역", address: "서울 영등포구 여의동로 343", lat: 37.5271, lng: 126.9329 },
  { id: "nodeul", name: "노들섬", address: "서울 용산구 양녕로 445", lat: 37.5176, lng: 126.9581 },
  { id: "ichon", name: "이촌 한강공원", address: "서울 용산구 이촌로72길 62", lat: 37.5178, lng: 126.9738 },
  { id: "seonyudo", name: "선유도공원", address: "서울 영등포구 선유로 343", lat: 37.5431, lng: 126.9001 },
];

export function joystickVector(x, y, radius = 48) {
  const length = Math.hypot(x, y);
  if (length < radius * 0.12) return { x: 0, y: 0 };
  const scale = Math.min(1, length / radius) / length;
  return { x: x * scale, y: -y * scale };
}
export function visibleNotes(notes, now = Date.now()) {
  return notes.filter((n) => n.expiresAt > now).slice(0, 2);
}
export const LESSONS = [
  ['이동해 보세요', '왼쪽 스틱을 밀어 이동하세요. PC에서는 WASD를 누릅니다.'],
  [
    '주위를 둘러보세요',
    '빈 화면을 좌우로 드래그하세요. PC에서는 마우스 오른쪽 버튼을 누르고 드래그합니다.',
  ],
  [
    '첫 보관함을 여세요',
    '◇ 표식을 따라가서 오른쪽의 확보 버튼을 누르세요. PC는 E입니다.',
  ],
  ['차량에 타 보세요', '◇ 차량 가까이 가서 탑승을 누르세요. PC는 F입니다.'],
  [
    '안전하게 내려 보세요',
    '스틱을 아래로 당겨 제동한 뒤 하차를 누르세요. PC는 S로 제동, F로 하차합니다.',
  ],
  [
    '준비 완료!',
    '완료를 누르면 첫 배송 의뢰가 시작됩니다. 물품을 확보해 차량으로 은신처에 배송하면 1,000 C를 받습니다.',
  ],
];

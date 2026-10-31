import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toChineseCurrency(money: number | undefined | null): string {
  if (money === undefined || money === null || isNaN(money) || money === 0) {
    return '零元整';
  }

  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const radices = ['', '拾', '佰', '仟'];
  const bigRadices = ['', '万', '亿'];

  const isNegative = money < 0;
  const num = Math.abs(money);

  // Split into integer and decimal parts
  const fixed = (Math.round(num * 100) / 100).toFixed(2);
  const [intStr, decStr] = fixed.split('.');

  // Process decimals
  let decResult = '';
  const d1 = parseInt(decStr[0], 10);
  const d2 = parseInt(decStr[1], 10);
  if (d1 === 0 && d2 === 0) {
    decResult = '整';
  } else {
    if (d1 > 0) decResult += digits[d1] + '角';
    if (d2 > 0) decResult += digits[d2] + '分';
  }

  // Process integer part
  const intNum = parseInt(intStr, 10);
  if (intNum === 0) {
    return (isNegative ? '欠' : '') + (decResult === '整' ? '零元整' : decResult);
  }

  let intResult = '';
  let zeroCount = 0;
  const len = intStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(intStr[i], 10);
    const pos = len - i - 1; // 0-based distance from unit
    const radiceIdx = pos % 4;
    const bigRadiceIdx = Math.floor(pos / 4);

    if (digit === 0) {
      zeroCount++;
    } else {
      if (zeroCount > 0) {
        intResult += '零';
      }
      zeroCount = 0;
      intResult += digits[digit] + radices[radiceIdx];
    }

    // At the end of every 4-digit section (pos % 4 === 0)
    if (radiceIdx === 0 && zeroCount < 4) {
      intResult += bigRadices[bigRadiceIdx];
    }
  }

  intResult += '元';

  return (isNegative ? '欠' : '') + intResult + decResult;
}



import { VoiceName, VoiceOption } from './types';

export const VOICES: VoiceOption[] = [
  { id: VoiceName.Kore, name: 'Kore', gender: 'Nữ', description: 'Rõ ràng, chuyên nghiệp và cân bằng' },
  { id: VoiceName.Puck, name: 'Puck', gender: 'Nam', description: 'Thân thiện, năng động và trẻ trung' },
  { id: VoiceName.Zephyr, name: 'Zephyr', gender: 'Nữ', description: 'Nhẹ nhàng, bay bổng và điềm tĩnh' },
  { id: VoiceName.Charon, name: 'Charon', gender: 'Nam', description: 'Trầm ấm, uy quyền và đậm chất điện ảnh' },
  { id: VoiceName.Fenrir, name: 'Fenrir', gender: 'Nam', description: 'Mạnh mẽ, khàn và đầy biểu cảm' }
];

export const EMOTIONS = [
  'Tự nhiên',
  'Vui vẻ',
  'Nghiêm túc/Tin tức',
  'Buồn',
  'Tức giận',
  'Thì thầm',
  'Hào hứng'
];

export const PITCH_OPTIONS = [
  'Rất thấp',
  'Thấp',
  'Trung bình',
  'Cao',
  'Rất cao'
];

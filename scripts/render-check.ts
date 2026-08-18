import { describeBinaryAvailability } from "../apps/api/src/modules/render/ffmpeg-binaries";

const bins = describeBinaryAvailability();
console.log(`FFmpeg: ${bins.ffmpeg ? `FOUND ${bins.ffmpeg}` : "NOT_FOUND"}`);
console.log(`FFprobe: ${bins.ffprobe ? `FOUND ${bins.ffprobe}` : "NOT_FOUND"}`);
if (!bins.ffmpeg) {
  console.error("请安装 FFmpeg 或设置 FFMPEG_PATH。不会伪装 Render 成功。");
  process.exitCode = 1;
}
if (!bins.ffprobe) {
  console.error("请安装 FFprobe 或设置 FFPROBE_PATH。");
  process.exitCode = 1;
}

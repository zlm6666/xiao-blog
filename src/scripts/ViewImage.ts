
import { LoadScript } from "@/utils/index";
// 图片灯箱
declare const ViewImage: any;
const ViewImgList: string[] = [
  // 文章内图片
  "article.vh-article-main img.vh-article-img",
  // 动态页面图片
  "main.talking-main>article>.main img",
  // Twikoo 评论区图片
  ".vh-comment>.twikoo>.tk-comments img:not(.tk-avatar-img,.OwO-item img,.tk-owo-emotion)",
  // Waline 评论区图片
  ".vh-comment div[data-waline] img:not(.wl-user-avatar,.wl-avatar img,.wl-reaction-list img,.wl-panel img,.tk-owo-emotion,.wl-emoji)"
];

/* ==================== 滚动锁定（防穿透） ==================== */
// 轻量锁定：只隐藏溢出，不改滚动位置、不用 position:fixed。
// 否则解锁时页面会先被顶回顶部、再被平滑滚动库慢慢滑回原处（Via / WebView 上尤其明显）。
let scrollLocked = false;

const lockScroll = () => {
  if (scrollLocked) return;
  scrollLocked = true;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
};

const unlockScroll = () => {
  if (!scrollLocked) return;
  scrollLocked = false;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
};

/* ==================== 手势缩放 ==================== */
const enhanceOverlay = (overlay: HTMLElement) => {
  // 裁剪放大后溢出屏幕的部分
  overlay.style.overflow = "hidden";
  // 屏蔽浏览器默认触摸滚动/缩放（缩放由下方手势自行处理），进一步杜绝滑动穿透
  overlay.style.touchAction = "none";

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let startScale = 1;
  let startTx = 0;
  let startTy = 0;
  let pinchStart = 0;
  let startX = 0;
  let startY = 0;
  let lastTap = 0;
  let pinching = false;

  const getImg = () => overlay.querySelector(".view-image-lead img") as HTMLImageElement | null;

  const apply = () => {
    const img = getImg();
    if (!img) return;
    img.style.transformOrigin = "center center";
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    img.style.willChange = "transform";
    img.style.cursor = scale > 1 ? "grab" : "zoom-in";
  };

  const reset = () => {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  };

  const distance = (t: TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  overlay.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (!getImg()) return;
      if (e.touches.length >= 2) {
        pinching = true;
        pinchStart = distance(e.touches);
        startScale = scale;
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTx = tx;
        startTy = ty;
        // 双击缩放 / 复位
        const now = Date.now();
        if (now - lastTap < 300) {
          lastTap = 0;
          if (scale > 1) {
            reset();
          } else {
            scale = 2.5;
            apply();
          }
        } else {
          lastTap = now;
        }
      }
    },
    { passive: true }
  );

  overlay.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (!getImg()) return;
      // 双指：缩放
      if (e.touches.length >= 2) {
        if (pinchStart > 0) {
          scale = Math.min(Math.max(startScale * (distance(e.touches) / pinchStart), 1), 6);
          if (scale === 1) {
            tx = 0;
            ty = 0;
          }
          apply();
        }
        e.preventDefault();
        return;
      }
      // 单指
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (scale > 1 && !pinching) {
          // 放大后拖动平移
          tx = startTx + dx;
          ty = startTy + dy;
          apply();
          e.preventDefault();
        } else if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          // 未放大时的真实滑动：拦截，避免滚动穿透到底层页面
          // （轻点/微动不拦截，保证点击空白可关闭）
          e.preventDefault();
        }
      }
    },
    { passive: false }
  );

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) pinching = false;
    if (scale <= 1) reset();
  };
  overlay.addEventListener("touchend", onTouchEnd);
  overlay.addEventListener("touchcancel", onTouchEnd);

  // 桌面端滚轮缩放
  overlay.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      if (!getImg()) return;
      if (!(e.target as HTMLElement).closest(".view-image-lead")) return;
      e.preventDefault();
      scale = Math.min(Math.max(scale - e.deltaY * 0.0015, 1), 6);
      if (scale === 1) {
        tx = 0;
        ty = 0;
      }
      apply();
    },
    { passive: false }
  );
};

/* ==================== 包装 display，接管打开/关闭 ==================== */
let wrapped = false;
const wrapDisplay = () => {
  if (wrapped || !ViewImage || typeof ViewImage.display !== "function") return;
  wrapped = true;
  const original = ViewImage.display;
  ViewImage.display = function (list: string[], cur: string) {
    original.call(ViewImage, list, cur);
    requestAnimationFrame(() => {
      const overlay = document.querySelector(".view-image") as HTMLElement | null;
      if (!overlay) return;
      lockScroll();
      enhanceOverlay(overlay);
      // 遮罩被移除（关闭）时解锁
      const mo = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
          unlockScroll();
          mo.disconnect();
        }
      });
      mo.observe(document.body, { childList: true });
    });
  };
};

// 初始化
export default async () => {
  try {
    ViewImage.init(ViewImgList.join(","));
  } catch (error) {
    await LoadScript("/assets/js/view-image.min.js");
    ViewImage.init(ViewImgList.join(","));
  }
  wrapDisplay();
};

import { useId } from "react";
import "./banner-backdrop.css";

/** Decorative vector scenery only: never intercepts photo controls or enters the accessibility tree. */
export function BannerBackdrop() {
  const prefix = useId().replace(/:/g, "");
  const heart = `${prefix}-heart`,
    star = `${prefix}-star`,
    flower = `${prefix}-flower`;
  return (
    <div className="banner-backdrop" aria-hidden="true">
      <svg
        viewBox="0 0 620 480"
        preserveAspectRatio="xMaxYMid slice"
        focusable="false"
      >
        <defs>
          <path
            id={heart}
            d="M0 6C-18-7-21-18-12-22C-6-25-1-20 0-17C3-24 12-25 16-19C22-10 10 0 0 6Z"
          />
          <path id={star} d="M0-12 3-3 12 0 3 3 0 12-3 3-12 0-3-3Z" />
          <g id={flower}>
            <path d="M0-3C-16-22-24 1-6 5C-23 18 0 28 4 10C18 28 29 4 10 1C25-15 1-25 0-3Z" />
            <circle r="3" />
          </g>
        </defs>
        <g className="banner-scene scene-cream">
          <path
            className="scene-route"
            d="M50 455C100 340 230 475 317 379S452 239 590 315"
          />
          <g transform="translate(492 46) rotate(12)">
            <rect width="84" height="103" rx="5" strokeDasharray="3 5" />
            <rect x="9" y="9" width="66" height="85" rx="3" />
            <path d="m24 64 14-22 10 13 13-26M19 77h47" />
            <use href={`#${heart}`} transform="translate(45 32) scale(.38)" />
          </g>
          <g transform="translate(478 392) rotate(-10)">
            <circle r="43" strokeDasharray="2 5" />
            <circle r="34" />
            <path d="m-18 4 15-9 20 5-18 2 1 14-7-11-10 4Z" />
          </g>
          <path d="M0 463h620M20 455h80M530 18l35 7" strokeDasharray="2 7" />
          <use href={`#${heart}`} transform="translate(584 214) scale(.5)" />
        </g>
        <g className="banner-scene scene-sage">
          <path d="M604 477C536 425 584 306 603 234M590 385c-40-3-60-25-53-46 30 4 47 17 53 46M588 344c31-8 46-28 35-49-25 8-35 21-35 49M591 299c-33-11-40-32-27-47 24 10 30 24 27 47M85 480c-7-32-25-48-54-56" />
          <g transform="translate(532 74) scale(1.6)">
            <use href={`#${flower}`} />
          </g>
          <g transform="translate(582 155) scale(.8)">
            <use href={`#${flower}`} />
          </g>
          <g transform="translate(467 441) scale(1.05)">
            <use href={`#${flower}`} />
          </g>
          <path className="scene-route" d="M40 460Q250 391 425 447" />
          <circle cx="482" cy="125" r="3" />
          <circle cx="550" cy="211" r="2" />
        </g>
        <g className="banner-scene scene-blush">
          <g transform="translate(487 47) rotate(12)">
            <rect width="105" height="73" rx="6" />
            <path d="m3 5 50 37 49-37M3 69l34-30m65 30L68 39" />
            <use href={`#${heart}`} transform="translate(52 39) scale(.42)" />
          </g>
          <path d="M588 356c-48-52-94-22-49 4 22 12 49-4 49-4s23-45 44-22c12 14-10 30-44 22Zm-3 1-33 73 29-8 6 27 18-88M584 357c-23 12-51 33-85 25" />
          <use
            href={`#${heart}`}
            transform="translate(455 163) rotate(-13) scale(.65)"
          />
          <use
            href={`#${heart}`}
            transform="translate(468 439) rotate(15) scale(.7)"
          />
          <path
            className="scene-route"
            d="M45 461c107-64 150 36 229-6s118-36 154-12"
          />
        </g>
        <g className="banner-scene scene-midnight">
          <path
            className="scene-moon"
            d="M551 32a49 49 0 1 0 41 77 42 42 0 0 1-41-77Z"
          />
          <use href={`#${star}`} transform="translate(465 58) scale(.65)" />
          <use href={`#${star}`} transform="translate(593 182) scale(.4)" />
          <use href={`#${star}`} transform="translate(413 131) scale(.35)" />
          <g transform="translate(553 373)">
            <path d="M0 0c-48-39-45 32 0 29 43-2 37-55 0-29Zm0 0c-30 1-25 29 1 19C24 8 14-10 0 0ZM2 30l-3 68M0 66c-27-24-45-16-36 0 9 12 27 12 36 0M0 78c22-28 45-24 37-6-6 12-25 18-37 6" />
          </g>
          <path className="scene-route" d="M90 466Q260 400 438 459" />
          <circle cx="489" cy="220" r="2" />
          <circle cx="367" cy="46" r="2" />
        </g>
        <g className="banner-scene scene-plum">
          <g transform="translate(529 57)">
            <path
              className="scene-moon"
              d="M14-29a38 38 0 1 0 32 57A33 33 0 0 1 14-29Z"
            />
            <path d="M-11 16q5 6 11 0m10 0q5 6 11 0M3 27q3 2 6 0" />
            <path d="m52-22 9-2-8 13 11-2m4-24 7-1-6 9 8-1" />
          </g>
          <path
            className="scene-cloud"
            d="M420 139c-15-21-42-9-40 11-27-9-41 26-16 33h122c26-8 12-40-11-31-1-32-39-41-55-13Z"
          />
          <path
            className="scene-cloud"
            d="M539 406c-17-33-57-21-57 7-27-16-46 24-20 33h137c28-7 17-43-7-36-11-32-42-31-53-4Z"
          />
          <use href={`#${heart}`} transform="translate(591 249) scale(.68)" />
          <use
            href={`#${heart}`}
            transform="translate(450 357) rotate(-18) scale(.48)"
          />
          <use href={`#${star}`} transform="translate(458 46) scale(.45)" />
          <circle cx="569" cy="341" r="2" />
          <circle cx="390" cy="107" r="2" />
        </g>
        <g className="banner-scene scene-moonlight">
          <circle className="scene-moon" cx="548" cy="68" r="33" />
          <path
            className="scene-hill"
            d="M133 480c104-119 184-67 252-113s145-25 235 6v107Z"
          />
          <path
            className="scene-hill"
            d="M260 480c102-98 166-93 223-68 49 23 88 0 137-22v90Z"
          />
          <path d="M580 434v-82m0 4-16 23h32l-24 29h33l-25-52M506 459v-51m0 4-13 19h26l-13-19" />
          <g className="scene-fireflies">
            <circle cx="448" cy="339" r="3" />
            <circle cx="577" cy="295" r="2" />
            <circle cx="359" cy="418" r="2" />
            <circle cx="527" cy="187" r="2" />
          </g>
          <use href={`#${star}`} transform="translate(465 97) scale(.35)" />
        </g>
        <g className="banner-scene scene-black">
          <path
            className="scene-constellation"
            d="m435 76 19-27 29-1 24 24 23-25 30 4 19 29-6 28-64 60-65-59Z"
          />
          <g className="scene-stars">
            <circle cx="435" cy="76" r="3" />
            <circle cx="454" cy="49" r="3" />
            <circle cx="483" cy="48" r="3" />
            <circle cx="507" cy="72" r="4" />
            <circle cx="530" cy="47" r="3" />
            <circle cx="560" cy="51" r="3" />
            <circle cx="579" cy="80" r="3" />
            <circle cx="573" cy="108" r="3" />
            <circle cx="509" cy="168" r="4" />
            <circle cx="444" cy="109" r="3" />
          </g>
          <use href={`#${star}`} transform="translate(590 221) scale(.6)" />
          <use href={`#${star}`} transform="translate(396 38) scale(.4)" />
          <path d="m508 365 74-35m-63 43 52-25" />
          <use
            href={`#${heart}`}
            transform="translate(497 384) rotate(22) scale(.65)"
          />
          <use href={`#${star}`} transform="translate(584 441) scale(.55)" />
          <circle cx="438" cy="430" r="2" />
          <circle cx="559" cy="282" r="2" />
          <circle cx="365" cy="328" r="2" />
          <path className="scene-route" d="M65 471Q260 398 408 456" />
        </g>
      </svg>
    </div>
  );
}

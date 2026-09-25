"""Entraîne : fruits / légumes, sain ou pourri."""

import json
import math
import random

from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from marketplace.produce_detect import MODEL_PATH as PROD_PATH
from marketplace.rot_detect import MODEL_PATH as ROT_PATH, sigmoid
from marketplace.vision import _extract_features, features_vector

PALETTES = {
    "tomate": [(190, 32, 28), (210, 48, 38), (165, 22, 18), (175, 40, 35)],
    "legume": [(40, 130, 48), (55, 150, 60), (30, 90, 40), (70, 140, 55), (90, 160, 70)],
    "plantain": [(210, 190, 48), (230, 205, 70), (140, 165, 50), (200, 175, 40)],
    "mangue": [(235, 145, 35), (245, 175, 45), (220, 120, 30), (250, 190, 60)],
    "fruit": [(230, 80, 90), (180, 40, 90), (250, 200, 40), (220, 60, 50)],
}

TYPE_OF = {
    "tomate": "legume",
    "legume": "legume",
    "plantain": "fruit",
    "mangue": "fruit",
    "fruit": "fruit",
}

MOLD = [(22, 18, 14), (18, 16, 12), (95, 70, 22), (40, 48, 18), (12, 12, 10), (70, 50, 18)]


def _noise(img, rng):
    if rng.random() < 0.55:
        img = ImageEnhance.Brightness(img).enhance(rng.uniform(0.72, 1.28))
    if rng.random() < 0.4:
        img = ImageEnhance.Color(img).enhance(rng.uniform(0.7, 1.25))
    if rng.random() < 0.35:
        img = img.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.15, 1.2)))
    return img


def _blob(draw, color, w, h, rng, n=8, rmin=3, rmax=20):
    for _ in range(n):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        r = rng.randint(rmin, rmax)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def make_kind(rng, kind, rotten=False, intensity=None):
    w = h = 96
    table = rng.choice(
        [(210, 205, 198), (176, 176, 172), (88, 86, 84), (236, 232, 224), (48, 46, 44), (160, 140, 120)]
    )
    img = Image.new("RGB", (w, h), table)
    draw = ImageDraw.Draw(img)
    base = rng.choice(PALETTES[kind])
    if rotten:
        fade = rng.uniform(0.62, 0.88)
        base = tuple(max(18, int(c * fade)) for c in base)
    cx, cy = w // 2 + rng.randint(-8, 8), h // 2 + rng.randint(-8, 8)
    if kind == "plantain":
        rx, ry = rng.randint(28, 40), rng.randint(10, 16)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=base)
        draw.ellipse((cx - rx + 8, cy - ry - 4, cx + rx - 4, cy + ry + 2), fill=tuple(min(255, c + 20) for c in base))
    else:
        rr = rng.randint(18, 32)
        draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=base)
    hi = tuple(min(255, c + rng.randint(8, 40)) for c in base)
    _blob(draw, hi, w, h, rng, n=rng.randint(2, 6), rmin=3, rmax=12)
    if rotten:
        level = intensity if intensity is not None else rng.uniform(0.55, 1.0)
        n_mold = 8 + int(16 * level)
        for _ in range(n_mold):
            _blob(draw, rng.choice(MOLD), w, h, rng, n=1, rmin=2, rmax=int(6 + 12 * level))
        img = ImageEnhance.Brightness(img).enhance(rng.uniform(0.7, 0.92))
        img = ImageEnhance.Color(img).enhance(rng.uniform(0.65, 0.95))
    return _noise(img, rng)


def vec_of(img):
    return features_vector(_extract_features(img))


def standardize(X):
    dim = len(X[0])
    n = len(X)
    mean = [sum(row[i] for row in X) / n for i in range(dim)]
    var = [sum((row[i] - mean[i]) ** 2 for row in X) / n for i in range(dim)]
    std = [math.sqrt(v) if v > 1e-9 else 1.0 for v in var]
    z = [[(row[i] - mean[i]) / std[i] for i in range(dim)] for row in X]
    return z, mean, std


def train_logreg(X, y, steps=420, lr=0.16):
    dim = len(X[0])
    w = [0.0] * dim
    b = 0.0
    n = len(X)
    for _ in range(steps):
        dw = [0.0] * dim
        db = 0.0
        for i, row in enumerate(X):
            z = b + sum(w[j] * row[j] for j in range(dim))
            p = sigmoid(z)
            err = p - y[i]
            db += err
            for j in range(dim):
                dw[j] += err * row[j]
        b -= lr * db / n
        w = [w[j] - lr * dw[j] / n for j in range(dim)]
    return w, b


def acc_bin(X, y, w, b, thresh=0.55):
    ok = 0
    for row, lab in zip(X, y):
        p = sigmoid(b + sum(w[j] * row[j] for j in range(len(w))))
        ok += int((p >= thresh) == (lab == 1))
    return ok / len(y)


def pack_clf(w, b, mean, std, accuracy):
    return {"weights": w, "bias": b, "mean": mean, "std": std, "accuracy": accuracy}


class Command(BaseCommand):
    help = "Entraîne fruits et légumes : identification + pourriture."

    def handle(self, *args, **options):
        from marketplace.learn_store import KIND_TO_TYPE, download_real_photos, iter_labeled_images

        n_web = download_real_photos(log=lambda m: self.stdout.write(m))
        self.stdout.write(f"Photos réelles / soumises téléchargées : {n_web}")

        rng = random.Random(21)
        kinds = list(PALETTES)
        n_fresh = 70
        n_rot = 70

        Xr, yr, types_r = [], [], []
        Xp, yp = [], []
        Xf, yf = [], []
        for kind in kinds:
            ptype = TYPE_OF[kind]
            for _ in range(n_fresh):
                v = vec_of(make_kind(rng, kind, rotten=False))
                Xr.append(v)
                yr.append(0)
                types_r.append(ptype)
                Xp.append(v)
                yp.append(kind)
                Xf.append(v)
                yf.append(kind)
            for _ in range(n_rot):
                v = vec_of(make_kind(rng, kind, rotten=True, intensity=rng.uniform(0.45, 1.0)))
                Xr.append(v)
                yr.append(1)
                types_r.append(ptype)
            for _ in range(40):
                v = vec_of(make_kind(rng, kind, rotten=True, intensity=rng.uniform(0.35, 0.65)))
                Xp.append(v)
                yp.append(kind)

        n_real = 0
        for img, kind, rotten in iter_labeled_images(rng, extra_aug=10):
            if kind not in KIND_TO_TYPE:
                continue
            v = vec_of(img)
            ptype = KIND_TO_TYPE[kind]
            Xr.append(v)
            yr.append(1 if rotten else 0)
            types_r.append(ptype)
            Xp.append(v)
            yp.append(kind)
            if not rotten:
                Xf.append(v)
                yf.append(kind)
            n_real += 1
        self.stdout.write(f"Exemples photo (réel + soumis, avec augmentations) : {n_real}")

        Zr, mean_r, std_r = standardize(Xr)
        wr, br = train_logreg(Zr, yr, steps=480)
        acc_r = acc_bin(Zr, yr, wr, br)

        by_type = {}
        type_acc = {}
        for tlabel in ("fruit", "legume"):
            Xt = [row for row, t in zip(Xr, types_r) if t == tlabel]
            yt = [lab for lab, t in zip(yr, types_r) if t == tlabel]
            Zt, mt, st = standardize(Xt)
            wt, bt = train_logreg(Zt, yt, steps=480)
            acc_t = acc_bin(Zt, yt, wt, bt)
            by_type[tlabel] = pack_clf(wt, bt, mt, st, acc_t)
            type_acc[tlabel] = acc_t

        ROT_PATH.parent.mkdir(parents=True, exist_ok=True)
        ROT_PATH.write_text(
            json.dumps(
                {
                    **pack_clf(wr, br, mean_r, std_r, acc_r),
                    "by_type": by_type,
                    "threshold": 0.5,
                    "rounds": 2,
                },
                indent=2,
            )
        )

        Zp, mean_p, std_p = standardize(Xp)
        classifiers = []
        ok = 0
        for label in kinds:
            ybin = [1 if t == label else 0 for t in yp]
            w, b = train_logreg(Zp, ybin, steps=380)
            classifiers.append({"label": label, "weights": w, "bias": b})
        for row, lab in zip(Zp, yp):
            scores = {
                clf["label"]: sigmoid(clf["bias"] + sum(clf["weights"][j] * row[j] for j in range(len(row))))
                for clf in classifiers
            }
            if max(scores, key=scores.get) == lab:
                ok += 1
        acc_p = ok / len(yp)

        type_clfs = []
        ytype = [TYPE_OF[t] for t in yf]
        Zf, mean_f, std_f = standardize(Xf)
        ok_t = 0
        for label in ("fruit", "legume"):
            ybin = [1 if t == label else 0 for t in ytype]
            w, b = train_logreg(Zf, ybin, steps=420)
            type_clfs.append({"label": label, "weights": w, "bias": b, "mean": mean_f, "std": std_f})
        for row, lab in zip(Zf, ytype):
            scores = {
                clf["label"]: sigmoid(clf["bias"] + sum(clf["weights"][j] * row[j] for j in range(len(row))))
                for clf in type_clfs
            }
            if max(scores, key=scores.get) == lab:
                ok_t += 1
        acc_type = ok_t / len(ytype)

        PROD_PATH.write_text(
            json.dumps(
                {
                    "classifiers": classifiers,
                    "type_classifiers": type_clfs,
                    "mean": mean_p,
                    "std": std_p,
                    "accuracy": acc_p,
                    "type_accuracy": acc_type,
                    "type_mean": mean_f,
                    "type_std": std_f,
                    "labels": kinds,
                    "includes_rotten_samples": True,
                    "includes_real_photos": True,
                },
                indent=2,
            )
        )

        import marketplace.produce_detect as pd
        import marketplace.rot_detect as rd

        rd._bundle = None
        pd._bundle = None
        self.stdout.write(
            self.style.SUCCESS(
                f"Pourri global {acc_r:.3f} · fruit {type_acc['fruit']:.3f} · "
                f"légume {type_acc['legume']:.3f} · "
                f"type {acc_type:.3f} · sous-type {acc_p:.3f}"
            )
        )
        self.stdout.write(self.style.SUCCESS(f"{ROT_PATH}\n{PROD_PATH}"))

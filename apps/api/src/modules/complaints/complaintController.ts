import { Request, Response, NextFunction } from "express";
import { complaintService } from "./complaintService";
import { findNearbyDuplicates } from "./duplicateService";
import { ComplaintCategory, ComplaintStatus, ComplaintPriority } from "@civicresolve/shared";
import { UnauthorizedError, ForbiddenError } from "../../utils/errors";

export class ComplaintController {
  async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text, language, imageBase64, imageMimeType } = req.body;
      const result = await complaintService.analyze({
        text,
        language,
        imageBase64,
        imageMimeType,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user?.id || null;
      const complaint = await complaintService.create(req.body, citizenId);

      res.status(201).json({
        success: true,
        data: complaint,
      });
    } catch (err) {
      next(err);
    }
  }

  async getByTrackingCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trackingCode } = req.params;
      const complaint = await complaintService.getByTrackingCode(trackingCode!);

      res.status(200).json({
        success: true,
        data: complaint,
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        category,
        priority,
        isEscalated,
        departmentId,
        citizenId,
        search,
        page,
        limit,
      } = req.query;

      // Security: BOLA / IDOR protection on citizen private complaint listings
      if (citizenId) {
        if (!req.user) {
          throw new UnauthorizedError("Authentication required to view citizen complaints");
        }
        if (req.user.role !== "ADMIN" && req.user.id !== citizenId) {
          throw new ForbiddenError("You cannot access another citizen's private complaints");
        }
      }

      // Sanitize and clamp pagination boundaries to prevent DoS / unbounded queries
      const safePage = Math.max(1, parseInt(String(page || "1"), 10) || 1);
      const safeLimit = Math.min(100, Math.max(1, parseInt(String(limit || "20"), 10) || 20));

      const complaints = await complaintService.list({
        status: status as ComplaintStatus,
        category: category as ComplaintCategory,
        priority: priority as ComplaintPriority,
        isEscalated: isEscalated !== undefined ? isEscalated === "true" : undefined,
        departmentId: departmentId as string,
        citizenId: citizenId as string,
        search: typeof search === "string" ? search.trim().slice(0, 100) : undefined,
        page: safePage,
        limit: safeLimit,
      });

      res.status(200).json({
        success: true,
        data: complaints,
      });
    } catch (err) {
      next(err);
    }
  }

  async getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radiusMeters, category } = req.query;

      const numLat = Number(lat);
      const numLng = Number(lng);

      if (isNaN(numLat) || isNaN(numLng)) {
        res.status(400).json({
          success: false,
          error: "Valid latitude (lat) and longitude (lng) query parameters are required",
        });
        return;
      }

      const safeRadius = Math.min(5000, Math.max(10, radiusMeters ? Number(radiusMeters) : 100));

      const duplicates = await findNearbyDuplicates({
        lat: numLat,
        lng: numLng,
        radiusMeters: isNaN(safeRadius) ? 100 : safeRadius,
        category: category as ComplaintCategory,
      });

      res.status(200).json({
        success: true,
        data: duplicates,
      });
    } catch (err) {
      next(err);
    }
  }

  async support(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await complaintService.support(id!, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const updated = await complaintService.updateStatus(id!, req.body, adminId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      const resolved = await complaintService.resolveComplaint(id!, req.body, adminId);

      res.status(200).json({
        success: true,
        data: resolved,
      });
    } catch (err) {
      next(err);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const citizenId = req.user?.id || null;
      const userRole = req.user?.role;

      const confirmed = await complaintService.confirmResolution(id!, citizenId, userRole);

      res.status(200).json({
        success: true,
        data: confirmed,
      });
    } catch (err) {
      next(err);
    }
  }

  async reopen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const citizenId = req.user?.id || null;
      const userRole = req.user?.role;
      const { remarks } = req.body;

      const reopened = await complaintService.reopenComplaint(id!, remarks, citizenId, userRole);

      res.status(200).json({
        success: true,
        data: reopened,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const complaintController = new ComplaintController();

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { UsersService } from '../users.service';
import { AuditService } from '../../common/audit/audit.service';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import {
  ImportUserRowDto,
  importUserRowSchema,
  ImportResultDto,
  ImportRowErrorDto,
  UserSummaryDto,
} from '../dto/import-user.dto';
import { users, memberships } from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { ZodError } from 'zod';

@Injectable()
export class UserImportService {
  private readonly logger = new Logger(UserImportService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Main import method - orchestrates the entire import process
   */
  async importUsers(
    file: Express.Multer.File,
    tenantId: string,
    actorUserId: string,
    dryRun: boolean,
  ): Promise<ImportResultDto> {
    this.logger.log(
      `Starting user import: ${file.originalname} (${file.size} bytes), dryRun=${dryRun}`,
    );

    try {
      // Step 1: Parse file
      const rows = await this.parseFile(file.buffer, file.mimetype);

      if (rows.length === 0) {
        throw new BadRequestException('File is empty or contains no valid data rows');
      }

      // Step 2: Validate all rows
      const { validRows, errors } = await this.validateRows(rows, tenantId);

      const result: ImportResultDto = {
        success: errors.length === 0,
        dryRun,
        totalRows: rows.length,
        validRows: validRows.length,
        errorCount: errors.length,
      };

      // Step 3: If errors exist, return error report
      if (errors.length > 0) {
        result.errors = errors;
        this.logger.warn(`Validation failed: ${errors.length} errors found`);
        return result;
      }

      // Step 4: If dry-run, return success message without creating users
      if (dryRun) {
        result.message = `Validation successful. All ${validRows.length} users are valid and ready to import.`;
        this.logger.log(`Dry-run validation successful for ${validRows.length} users`);

        // Log audit for dry-run
        await this.auditService.logBulkUserImport(tenantId, actorUserId, {
          fileName: file.originalname,
          totalRows: rows.length,
          createdCount: 0,
          existingCount: 0,
          errorCount: 0,
          dryRun: true,
        });

        return result;
      }

      // Step 5: Bulk create users
      const { createdUsers, existingUsers } = await this.bulkCreateUsers(
        validRows,
        tenantId,
        actorUserId,
      );

      result.createdCount = createdUsers.length;
      result.existingCount = existingUsers.length;
      result.createdUsers = createdUsers;
      result.existingUsers = existingUsers;
      result.message = `Successfully imported ${createdUsers.length} new users and added ${existingUsers.length} existing users to tenant.`;

      this.logger.log(
        `Import completed: ${createdUsers.length} created, ${existingUsers.length} existing`,
      );

      // Log audit
      await this.auditService.logBulkUserImport(tenantId, actorUserId, {
        fileName: file.originalname,
        totalRows: rows.length,
        createdCount: createdUsers.length,
        existingCount: existingUsers.length,
        errorCount: 0,
        dryRun: false,
      });

      return result;
    } catch (error) {
      this.logger.error('Import failed', error);
      throw error;
    }
  }

  /**
   * Parse CSV or Excel file into array of row objects
   */
  private async parseFile(buffer: Buffer, mimetype: string): Promise<Record<string, any>[]> {
    this.logger.log(`Parsing file with mimetype: ${mimetype}`);

    try {
      if (mimetype === 'text/csv') {
        return this.parseCsv(buffer);
      } else {
        // Excel files
        return this.parseExcel(buffer);
      }
    } catch (error) {
      this.logger.error('File parsing failed', error);
      throw new BadRequestException(
        'Failed to parse file. Please ensure the file is valid CSV or Excel format.',
      );
    }
  }

  /**
   * Parse CSV file using PapaParse
   */
  private parseCsv(buffer: Buffer): Record<string, any>[] {
    const csvString = buffer.toString('utf-8');

    const parseResult = Papa.parse<Record<string, any>>(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => this.normalizeColumnName(header) || header,
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      this.logger.warn(`CSV parsing warnings: ${JSON.stringify(parseResult.errors)}`);
    }

    return parseResult.data;
  }

  /**
   * Parse Excel file using xlsx
   */
  private parseExcel(buffer: Buffer): Record<string, any>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('Excel file contains no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Normalize column names
    return rawData.map((row: any) => {
      const normalizedRow: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = this.normalizeColumnName(key);
        if (normalizedKey) {
          normalizedRow[normalizedKey] = value;
        }
      }
      return normalizedRow;
    });
  }

  /**
   * Normalize column names to standard camelCase format
   * Handles case-insensitive and flexible naming
   */
  private normalizeColumnName(header: string): string | null {
    const normalized = header
      .trim()
      .toLowerCase()
      .replace(/[_\s-]+/g, ''); // Remove spaces, underscores, hyphens

    const columnMap: Record<string, string> = {
      email: 'email',
      emailaddress: 'email',
      useremail: 'email',
      'e-mail': 'email',

      name: 'name',
      fullname: 'name',
      username: 'name',

      role: 'role',
      userrole: 'role',

      jobtitle: 'jobTitle',
      title: 'jobTitle',
      position: 'jobTitle',

      startdate: 'startDate',
      hiredate: 'startDate',
      joindate: 'startDate',

      manageremail: 'managerEmail',
      manager: 'managerEmail',
      reportsto: 'managerEmail',

      location: 'location',
      office: 'location',
      officelocation: 'location',

      phone: 'phone',
      phonenumber: 'phone',
      contactnumber: 'phone',
    };

    return columnMap[normalized] || null;
  }

  /**
   * Validate all rows and collect errors
   */
  private async validateRows(
    rows: Record<string, any>[],
    tenantId: string,
  ): Promise<{
    validRows: ImportUserRowDto[];
    errors: ImportRowErrorDto[];
  }> {
    this.logger.log(`Validating ${rows.length} rows`);

    const validRows: ImportUserRowDto[] = [];
    const errors: ImportRowErrorDto[] = [];
    const seenEmails = new Map<string, number>(); // email -> row number

    // Step 1: Schema validation and duplicate detection within file
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1; // 1-indexed for user display
      const row = rows[i];

      try {
        // Validate with zod schema
        const validatedRow = importUserRowSchema.parse(row);

        // Check for duplicate email within file
        const email = validatedRow.email.toLowerCase();
        if (seenEmails.has(email)) {
          errors.push({
            row: rowNumber,
            email: validatedRow.email,
            errors: [`Duplicate email in import file (first seen at row ${seenEmails.get(email)})`],
          });
          continue;
        }

        seenEmails.set(email, rowNumber);
        validRows.push(validatedRow);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({
            row: rowNumber,
            email: row.email || 'unknown',
            errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
          });
        } else {
          errors.push({
            row: rowNumber,
            email: row.email || 'unknown',
            errors: ['Unknown validation error'],
          });
        }
      }
    }

    // If schema validation failed, return early
    if (errors.length > 0) {
      return { validRows: [], errors };
    }

    // Step 2: Resolve manager emails to UUIDs
    const managerEmailMap = await this.resolveManagerEmails(validRows, tenantId);

    // Step 3: Check for existing tenant memberships
    const existingMemberships = await this.checkExistingMemberships(
      validRows.map((r) => r.email),
      tenantId,
    );

    // Step 4: Validate managers and check duplicates
    for (let i = 0; i < validRows.length; i++) {
      const rowNumber = i + 1;
      const row = validRows[i];
      const rowErrors: string[] = [];

      // Check if user already exists in tenant
      if (existingMemberships.has(row.email.toLowerCase())) {
        rowErrors.push('User already exists in this tenant');
      }

      // Validate manager email if provided
      if (row.managerEmail) {
        const managerUserId = managerEmailMap.get(row.managerEmail.toLowerCase());
        if (!managerUserId) {
          rowErrors.push(`Manager not found in tenant: ${row.managerEmail}`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          email: row.email,
          errors: rowErrors,
        });
      }
    }

    // If validation errors occurred, return empty valid rows
    if (errors.length > 0) {
      return { validRows: [], errors };
    }

    return { validRows, errors };
  }

  /**
   * Resolve manager emails to user IDs
   * Returns Map<email, userId> for managers that exist in tenant
   */
  private async resolveManagerEmails(
    rows: ImportUserRowDto[],
    tenantId: string,
  ): Promise<Map<string, string>> {
    const managerEmails = rows
      .map((r) => r.managerEmail?.toLowerCase())
      .filter((email): email is string => !!email);

    if (managerEmails.length === 0) {
      return new Map();
    }

    const db = this.dbService.getDb();

    // Batch query for all manager emails
    const managers = await db
      .select({
        email: users.email,
        userId: users.id,
      })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          inArray(
            users.email,
            managerEmails.map((e) => e.toLowerCase()),
          ),
        ),
      );

    const managerMap = new Map<string, string>();
    for (const manager of managers) {
      managerMap.set(manager.email.toLowerCase(), manager.userId);
    }

    return managerMap;
  }

  /**
   * Check which emails already have memberships in this tenant
   * Returns Set of emails that exist
   */
  private async checkExistingMemberships(emails: string[], tenantId: string): Promise<Set<string>> {
    const db = this.dbService.getDb();

    const existing = await db
      .select({
        email: users.email,
      })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          inArray(
            users.email,
            emails.map((e) => e.toLowerCase()),
          ),
        ),
      );

    return new Set(existing.map((row) => row.email.toLowerCase()));
  }

  /**
   * Bulk create users using existing UsersService.create() method
   */
  private async bulkCreateUsers(
    rows: ImportUserRowDto[],
    tenantId: string,
    actorUserId: string,
  ): Promise<{
    createdUsers: UserSummaryDto[];
    existingUsers: UserSummaryDto[];
  }> {
    this.logger.log(`Creating ${rows.length} users`);

    const createdUsers: UserSummaryDto[] = [];
    const existingUsers: UserSummaryDto[] = [];

    // Resolve manager emails to IDs (we know they exist from validation)
    const managerEmailMap = await this.resolveManagerEmails(rows, tenantId);

    // Process each row sequentially (could be parallelized if needed)
    for (const row of rows) {
      try {
        // Check if user exists globally
        const db = this.dbService.getDb();
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, row.email.toLowerCase()))
          .limit(1);

        const isExistingUser = !!existingUser;

        // Prepare DTO for UsersService.create()
        const createUserDto: any = {
          email: row.email,
          name: row.name,
          role: row.role,
          sendInvite: true, // Send invitations
          profile: {},
        };

        // Add profile fields if provided
        if (row.jobTitle) createUserDto.profile.jobTitle = row.jobTitle;
        if (row.startDate) createUserDto.profile.startDate = row.startDate;
        if (row.location) createUserDto.profile.location = row.location;
        if (row.phone) createUserDto.profile.phone = row.phone;

        // Resolve manager email to ID
        if (row.managerEmail) {
          const managerUserId = managerEmailMap.get(row.managerEmail.toLowerCase());
          if (managerUserId) {
            createUserDto.profile.managerUserId = managerUserId;
          }
        }

        // Remove empty profile object
        if (Object.keys(createUserDto.profile).length === 0) {
          delete createUserDto.profile;
        }

        // Call existing create method
        const result = await this.usersService.create(tenantId, createUserDto, actorUserId);

        const userSummary: UserSummaryDto = {
          id: result.data.id,
          email: result.data.email,
          name: result.data.name || '',
          role: result.data.membership.role,
          status: result.data.membership.status,
        };

        if (isExistingUser) {
          userSummary.note = 'User already existed, added to tenant';
          existingUsers.push(userSummary);
        } else {
          createdUsers.push(userSummary);
        }
      } catch (error) {
        // This should not happen due to validation, but log if it does
        this.logger.error(`Failed to create user ${row.email}`, error);
        throw error;
      }
    }

    return { createdUsers, existingUsers };
  }

  /**
   * Generate template file (CSV or Excel)
   */
  generateTemplate(format: 'csv' | 'xlsx'): {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  } {
    const headers = [
      'email',
      'name',
      'role',
      'jobTitle',
      'startDate',
      'managerEmail',
      'location',
      'phone',
    ];

    const exampleRows = [
      {
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'employee',
        jobTitle: 'Software Engineer',
        startDate: '2025-01-15',
        managerEmail: 'alice.manager@example.com',
        location: 'New York',
        phone: '+1-555-0100',
      },
      {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        role: 'manager',
        jobTitle: 'Engineering Manager',
        startDate: '2025-01-10',
        managerEmail: '',
        location: 'San Francisco',
        phone: '+1-555-0200',
      },
      {
        email: 'bob.admin@example.com',
        name: 'Bob Admin',
        role: 'admin',
        jobTitle: 'CTO',
        startDate: '2025-01-01',
        managerEmail: '',
        location: 'Remote',
        phone: '+1-555-0300',
      },
    ];

    if (format === 'csv') {
      const csv = Papa.unparse({
        fields: headers,
        data: exampleRows,
      });

      return {
        buffer: Buffer.from(csv, 'utf-8'),
        filename: 'user-import-template.csv',
        mimetype: 'text/csv',
      };
    } else {
      // Excel format
      const worksheet = XLSX.utils.json_to_sheet(exampleRows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return {
        buffer: buffer as Buffer,
        filename: 'user-import-template.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
  }
}

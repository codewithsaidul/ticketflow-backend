/* eslint-disable @typescript-eslint/no-explicit-any */
import { Query } from "mongoose";
import { excludedFields } from "../constants/global.constants";

export class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public readonly query: Record<string, any>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, any>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  filter(): this {
    let filter = { ...this.query };
    const sanitizedFilter: Record<string, any> = {};
    for (const [key, value] of Object.entries(filter)) {
      if (excludedFields.includes(key)) continue;
      if (value === "" || value === "undefined") continue;
      sanitizedFilter[key] = value;
    }
    filter = sanitizedFilter;

    this.modelQuery = this.modelQuery.find(filter);

    return this;
  }

  search(searchableFields: string[]): this {
    const searchTerm = this.query.searchTerm || "";
    const searchQuery = {
      $or: searchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    };

    this.modelQuery = this.modelQuery.find(searchQuery);

    return this;
  }

  sort(): this {
    const sort =
      (this.query.sort as string)?.split(",").join(" ") || "-createdAt";

    this.modelQuery = this.modelQuery.sort(sort as string);

    return this;
  }

  fields(): this {
    const fields = this.query.fields?.split(",").join(" ") || "";
    this.modelQuery = this.modelQuery.select(fields);

    return this;
  }

  paginate(): this {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    return this;
  }

  populate(path: string, select?: string): this {
    this.modelQuery = this.modelQuery.populate(path, select);
    return this;
  }

  build() {
    return this.modelQuery;
  }

  async getMeta() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const filterDocuments = this.modelQuery.getFilter();

    const totalDocuments = await this.modelQuery.model.countDocuments(
      filterDocuments
    );

    return {
      page,
      limit,
      total: totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
    };
  }
}

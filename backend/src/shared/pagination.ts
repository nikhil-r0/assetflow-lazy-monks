export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function parsePagination(query: any): PaginationParams {
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  let pageSize = parseInt(query.pageSize, 10);
  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = 20;
  }
  if (pageSize > 100) {
    pageSize = 100;
  }

  const sort = query.sort && typeof query.sort === 'string' ? query.sort : undefined;
  const order = query.order === 'desc' ? 'desc' : 'asc';

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sort,
    order,
  };
}

export function buildEnvelope<T>(data: T[], total: number, page: number, pageSize: number) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

# API Documentation Requirements

## URL and Endpoint Documentation Rule

All API URLs and endpoints MUST include a reference to their official documentation source.

### Required Format

When defining API endpoints in code, always include:

1. **Comment with endpoint description**
2. **Reference link to official API documentation**
3. **HTTP method and path**

### Example Format

```typescript
// Endpoint: GET /order/sellers/{sellerId}/orders
// Reference: https://developers.trendyol.com/int/docs/international-marketplace/international-order-v2/int-getShipmentPackages
const url = `${this.baseUrl}/order/sellers/${this.supplierId}/orders`;
```

### Approved API References

#### Trendyol API
- **Base URL**: `https://apigw.trendyol.com/integration`
- **Documentation**: https://developers.trendyol.com/int/docs/international-marketplace/international-order-v2/int-getShipmentPackages
- **Endpoints**:
  - `GET /order/sellers/{sellerId}/orders` - Fetch shipment packages
  - `POST /sellers/{sellerId}/seller-invoice-file` - Send invoice to order

#### Oblio API
- **Base URL**: `https://www.oblio.eu/api`
- **Documentation**: https://www.oblio.eu/api#overview
- **Endpoints**:
  - `POST /docs/invoice` - Create invoice
  - `GET /docs/invoice/{docId}` - Get invoice details
  - `GET /companies` - Get companies list

### Enforcement

- All API client implementations MUST follow this documentation standard
- Code reviews MUST verify that API endpoints include proper references
- No hardcoded URLs without documentation references are allowed
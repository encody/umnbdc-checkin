import React from 'react';
import Badge from 'react-bootstrap/esm/Badge';
import { ICharge, isPaid, isOverdue, hasPayment } from '../../model/Charge';

export function PaymentStatusBadge(props: {
  charge?: ICharge;
  variant?: 'paid' | 'overdue' | 'partial' | 'pending';
}) {
  if (props.variant === 'paid' || (props.charge && isPaid(props.charge))) {
    return <Badge variant="dark">Paid</Badge>;
  } else if (
    props.variant === 'overdue' ||
    (props.charge && isOverdue(props.charge))
  ) {
    return <Badge variant="danger">Overdue</Badge>;
  } else if (
    props.variant === 'partial' ||
    (props.charge && hasPayment(props.charge))
  ) {
    return <Badge variant="info">Partial</Badge>;
  }

  return <Badge variant="warning">Pending</Badge>;
}

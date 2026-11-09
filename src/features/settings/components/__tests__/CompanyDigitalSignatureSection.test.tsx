import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompanyDigitalSignatureSection } from '../CompanyDigitalSignatureSection';

describe('CompanyDigitalSignatureSection - Signature Canvas Coordinate Mapping', () => {
  it('correctly calculates canvas coordinates relative to CSS bounding client rect', () => {
    const mockCtx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 2.5,
      strokeStyle: '#092C74',
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      right: 900,
      bottom: 300,
      width: 800,
      height: 250,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    render(
      <CompanyDigitalSignatureSection
        signerName="Nguyen Gia Khanh"
        signerTitle="General Director"
        signerEmail="khanh@alsm.io"
        companyName="ALSM SOFTWARE MODERNIZATION TECHNOLOGY JOINT STOCK COMPANY"
        certProvider="VNPT-CA"
        certSerial="VNPT-ECA-ALSM-01"
        signatureImageUrl=""
        setSignatureImageUrl={vi.fn()}
        companySealUrl=""
        setCompanySealUrl={vi.fn()}
        signatureType="drawn"
        setSignatureType={vi.fn()}
        stampPosition="side_by_side"
        setStampPosition={vi.fn()}
        signingMethod="cloud_ca"
        setSigningMethod={vi.fn()}
      />
    );

    // Ensure we are on "Draw Signature" tab
    const drawTab = screen.getByRole('button', { name: /Draw Signature/i });
    fireEvent.click(drawTab);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();

    // Mock getBoundingClientRect: 800px display width, 250px height
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      right: 900,
      bottom: 300,
      width: 800,
      height: 250,
      x: 100,
      y: 50,
      toJSON: () => {},
    });

    // Simulate clicking in the center of the display element (clientX = 500 => relative X = 400)
    // Canvas has 2x Retina resolution: width = 800 * 2 = 1600, height = 250 * 2 = 500
    // Expected mapped X = 400 * 2 = 800, mapped Y = 125 * 2 = 250
    fireEvent.mouseDown(canvas, { clientX: 500, clientY: 175 });
    expect(mockCtx.moveTo).toHaveBeenCalledWith(800, 250);

    // Simulate dragging cursor to clientX = 700 (relative X = 600)
    // Expected mapped X = 600 * 2 = 1200, mapped Y = 125 * 2 = 250
    fireEvent.mouseMove(canvas, { clientX: 700, clientY: 175 });
    expect(mockCtx.lineTo).toHaveBeenCalledWith(1200, 250);

    // Stop drawing
    fireEvent.mouseUp(canvas);
  });
});
